package com.example.mi_backend.service;

import com.example.mi_backend.dto.TituladosFiltroDTO;
import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

@Service
public class CrucesYSimulacionService {

    private final JdbcTemplate jdbcTemplate;

    public CrucesYSimulacionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ========================================================================
    // 1. CRUCES Y EXPORTACIÓN (Incluye Fisher-Freeman-Halton Monte Carlo)
    // ========================================================================
    public Map<String, Object> calcularCruceAvanzado(
            String encuesta, String varFila, String varColumna, TituladosFiltroDTO filtro) {

        boolean esEmpleadores = "empleadores".equalsIgnoreCase(encuesta);
        String vista = esEmpleadores ? "public.vw_empleadores_variables" : "public.vw_titulados_variables";

        Integer validas = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.pregunta WHERE encuesta = ? AND codigo IN (?, ?)",
            Integer.class, encuesta.toLowerCase(Locale.ROOT), varFila, varColumna
        );
        if (validas == null || validas < 2) {
            throw new IllegalArgumentException("Variables no válidas para la encuesta " + encuesta);
        }

        List<Object> params = new ArrayList<Object>();
        params.add(varFila);
        params.add(varColumna);

        String joinFiltros = "";
        String whereFiltros = "";
        if (!esEmpleadores && filtro != null) {
            joinFiltros = " JOIN public.respuesta r ON r.id = a.respuesta_id " +
                          " JOIN public.titulado t ON t.id = r.id " +
                          " LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                          " LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                          " LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id ";
            whereFiltros = construirWhereTitulados(filtro, params);
        } else if (esEmpleadores && filtro != null && filtro.getImportacionId() != null && filtro.getImportacionId() > 0) {
            whereFiltros = " AND a.importacion_id = ? ";
            params.add(filtro.getImportacionId());
        }

        String sql = "SELECT a.valor AS fila, b.valor AS columna, COUNT(*) AS total " +
                     "FROM " + vista + " a " +
                     "JOIN " + vista + " b ON a.respuesta_id = b.respuesta_id " +
                     joinFiltros +
                     "WHERE a.pregunta_codigo = ? AND b.pregunta_codigo = ? " + whereFiltros +
                     " GROUP BY a.valor, b.valor";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        if (rows.isEmpty()) {
            throw new IllegalStateException("No existen datos cruzados para las variables y filtros seleccionados.");
        }

        List<String> ordenFila = jdbcTemplate.queryForList(
            "SELECT valor FROM public.opcion WHERE pregunta_codigo = ? ORDER BY orden ASC",
            String.class, varFila
        );
        List<String> ordenCol = jdbcTemplate.queryForList(
            "SELECT valor FROM public.opcion WHERE pregunta_codigo = ? ORDER BY orden ASC",
            String.class, varColumna
        );

        Set<String> setF = new LinkedHashSet<String>(ordenFila);
        Set<String> setC = new LinkedHashSet<String>(ordenCol);
        Map<String, Map<String, Long>> mapa = new HashMap<String, Map<String, Long>>();

        for (Map<String, Object> r : rows) {
            String f = String.valueOf(r.get("fila"));
            String c = String.valueOf(r.get("columna"));
            long cnt = ((Number) r.get("total")).longValue();
            setF.add(f);
            setC.add(c);
            mapa.computeIfAbsent(f, k -> new HashMap<String, Long>()).put(c, cnt);
        }

        List<String> catFila = setF.stream().filter(mapa::containsKey).toList();
        List<String> catCol = setC.stream()
            .filter(c -> rows.stream().anyMatch(r -> c.equals(String.valueOf(r.get("columna")))))
            .toList();

        int rCount = catFila.size();
        int cCount = catCol.size();
        long[][] observados = new long[rCount][cCount];
        long[] totFila = new long[rCount];
        long[] totCol = new long[cCount];
        long granTotal = 0L;

        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                long v = mapa.getOrDefault(catFila.get(i), Collections.<String, Long>emptyMap()).getOrDefault(catCol.get(j), 0L);
                observados[i][j] = v;
                totFila[i] += v;
                totCol[j] += v;
                granTotal += v;
            }
        }

        int celdasEsperadaMenor5 = 0;
        double[][] esperados = new double[rCount][cCount];
        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                double exp = granTotal > 0 ? (double) (totFila[i] * totCol[j]) / granTotal : 0.0;
                esperados[i][j] = Math.round(exp * 100.0) / 100.0;
                if (exp < 5.0) {
                    celdasEsperadaMenor5++;
                }
            }
        }

        double chi2 = 0.0;
        double pValorChi2 = 1.0;
        int gl = Math.max(1, (rCount - 1) * (cCount - 1));
        double vCramer = 0.0;

        if (rCount >= 2 && cCount >= 2 && granTotal > 0) {
            ChiSquareTest chiTest = new ChiSquareTest();
            chi2 = chiTest.chiSquare(observados);
            pValorChi2 = chiTest.chiSquareTest(observados);
            int minDim = Math.min(rCount - 1, cCount - 1);
            vCramer = minDim > 0 ? Math.sqrt(chi2 / (granTotal * minDim)) : 0.0;
        }

        double pValorFisherMC = calcularFisherFreemanHaltonMonteCarlo(observados, totFila, totCol, (int) granTotal, 10000);
        boolean usarFisher = celdasEsperadaMenor5 > 0;

        List<Map<String, Object>> filasDetalle = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < rCount; i++) {
            List<Map<String, Object>> celdas = new ArrayList<Map<String, Object>>();
            for (int j = 0; j < cCount; j++) {
                long val = observados[i][j];
                double pctFila = totFila[i] > 0 ? Math.round((val * 1000.0) / totFila[i]) / 10.0 : 0.0;
                double pctTotal = granTotal > 0 ? Math.round((val * 1000.0) / granTotal) / 10.0 : 0.0;
                Map<String, Object> celda = new LinkedHashMap<String, Object>();
                celda.put("columna", catCol.get(j));
                celda.put("frecuencia", val);
                celda.put("porcentajeFila", pctFila);
                celda.put("porcentajeTotal", pctTotal);
                celdas.add(celda);
            }
            Map<String, Object> filaObj = new LinkedHashMap<String, Object>();
            filaObj.put("etiqueta", catFila.get(i));
            filaObj.put("nFila", totFila[i]);
            filaObj.put("porcentajeSobreTotal", granTotal > 0 ? Math.round((totFila[i] * 1000.0) / granTotal) / 10.0 : 0.0);
            filaObj.put("celdas", celdas);
            filasDetalle.add(filaObj);
        }

        String magnitudCramer = vCramer < 0.1 ? "Despreciable" : (vCramer < 0.3 ? "Pequeña" : (vCramer < 0.5 ? "Moderada" : "Grande"));

        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", usarFisher ? "Fisher-Freeman-Halton (Monte Carlo)" : "Chi-cuadrado de Pearson");
        prueba.put("pValor", Math.round((usarFisher ? pValorFisherMC : pValorChi2) * 1000.0) / 1000.0);
        prueba.put("pValorFisherMC", Math.round(pValorFisherMC * 1000.0) / 1000.0);
        prueba.put("pValorChi2", Math.round(pValorChi2 * 1000.0) / 1000.0);
        prueba.put("chiCuadrado", Math.round(chi2 * 1000.0) / 1000.0);
        prueba.put("gradosLibertad", gl);
        prueba.put("vCramer", Math.round(vCramer * 1000.0) / 1000.0);
        prueba.put("magnitudEfecto", magnitudCramer);
        prueba.put("celdasEsperadaMenor5", celdasEsperadaMenor5);
        prueba.put("totalCeldas", rCount * cCount);
        prueba.put("significativo", (usarFisher ? pValorFisherMC : pValorChi2) < 0.05);

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("encuesta", encuesta);
        res.put("variableFila", varFila);
        res.put("variableColumna", varColumna);
        res.put("categoriasFila", catFila);
        res.put("categoriasColumna", catCol);
        res.put("filas", filasDetalle);
        res.put("observados", observados);
        res.put("esperados", esperados);
        res.put("totalesFila", totFila);
        res.put("totalesColumna", totCol);
        res.put("totalN", granTotal);
        res.put("prueba", prueba);
        return res;
    }

    // Fisher-Freeman-Halton exacto por permutaciones de tabla con marginales fijos
    private double calcularFisherFreemanHaltonMonteCarlo(
            long[][] obs, long[] totFila, long[] totCol, int n, int iteraciones) {

        if (n <= 0 || obs.length < 2 || obs[0].length < 2) {
            return 1.0;
        }

        double[] logFact = new double[n + 1];
        for (int i = 1; i <= n; i++) {
            logFact[i] = logFact[i - 1] + Math.log(i);
        }

        double logProbObs = calcularLogProbabilidadTabla(obs, logFact);

        int[] arregloCol = new int[n];
        int cursor = 0;
        for (int j = 0; j < totCol.length; j++) {
            for (int k = 0; k < totCol[j]; k++) {
                arregloCol[cursor++] = j;
            }
        }

        int rCount = totFila.length;
        int cCount = totCol.length;
        long[][] tablaPerm = new long[rCount][cCount];
        Random rnd = new Random(42L);
        int extremos = 0;

        for (int it = 0; it < iteraciones; it++) {
            for (int i = n - 1; i > 0; i--) {
                int swap = rnd.nextInt(i + 1);
                int tmp = arregloCol[i];
                arregloCol[i] = arregloCol[swap];
                arregloCol[swap] = tmp;
            }

            for (int i = 0; i < rCount; i++) {
                Arrays.fill(tablaPerm[i], 0L);
            }

            int pos = 0;
            for (int i = 0; i < rCount; i++) {
                for (int k = 0; k < totFila[i]; k++) {
                    tablaPerm[i][arregloCol[pos++]]++;
                }
            }

            double logProbPerm = calcularLogProbabilidadTabla(tablaPerm, logFact);
            if (logProbPerm <= logProbObs + 1e-9) {
                extremos++;
            }
        }

        return (double) extremos / iteraciones;
    }

    private double calcularLogProbabilidadTabla(long[][] tabla, double[] logFact) {
        double suma = 0.0;
        for (long[] fila : tabla) {
            for (long val : fila) {
                suma -= logFact[(int) val];
            }
        }
        return suma;
    }

    // ========================================================================
    // 2. SIMULACIÓN DE ESCENARIOS (Monte Carlo con Transformada Inversa)
    // ========================================================================
    public Map<String, Object> simularMonteCarloTransformadaInversa(
            String preguntaCodigo,
            int personasSimularN,
            int replicasR,
            long semilla,
            Map<String, Double> probabilidadesPersonalizadasPct,
            TituladosFiltroDTO filtro) {

        int nSim = Math.max(10, Math.min(50000, personasSimularN));
        int rSim = Math.max(10, Math.min(10000, replicasR));

        List<Object> params = new ArrayList<Object>();
        params.add(preguntaCodigo);

        String where = construirWhereTitulados(filtro, params);
        String sql = "SELECT v.valor AS categoria, COALESCE(o.orden, 999) AS orden, COUNT(*) AS frecuencia " +
                     "FROM public.vw_titulados_variables v " +
                     "JOIN public.respuesta r ON r.id = v.respuesta_id " +
                     "JOIN public.titulado t ON t.id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "LEFT JOIN public.opcion o ON o.pregunta_codigo = v.pregunta_codigo AND o.valor = v.valor " +
                     "WHERE v.pregunta_codigo = ? " + where +
                     " GROUP BY v.valor, o.orden ORDER BY orden ASC, frecuencia DESC";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        if (rows.isEmpty()) {
            throw new IllegalStateException("No existen datos observados para simular la variable " + preguntaCodigo);
        }

        long baseObservadaN = rows.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        int k = rows.size();
        List<String> categorias = new ArrayList<String>();
        double[] probObservada = new double[k];
        double[] probEscenario = new double[k];

        double sumaProb = 0.0;
        for (int i = 0; i < k; i++) {
            String cat = String.valueOf(rows.get(i).get("categoria"));
            long freq = ((Number) rows.get(i).get("frecuencia")).longValue();
            categorias.add(cat);
            probObservada[i] = baseObservadaN > 0 ? (double) freq / baseObservadaN : 0.0;

            if (probabilidadesPersonalizadasPct != null && probabilidadesPersonalizadasPct.containsKey(cat)) {
                probEscenario[i] = Math.max(0.0, probabilidadesPersonalizadasPct.get(cat) / 100.0);
            } else {
                probEscenario[i] = probObservada[i];
            }
            sumaProb += probEscenario[i];
        }

        if (sumaProb <= 0.0) {
            Arrays.fill(probEscenario, 1.0 / k);
        } else {
            for (int i = 0; i < k; i++) {
                probEscenario[i] = probEscenario[i] / sumaProb;
            }
        }

        // Función de distribución acumulada (CDF) para transformada inversa F^-1(U)
        double[] cdf = new double[k];
        double acum = 0.0;
        for (int i = 0; i < k; i++) {
            acum += probEscenario[i];
            cdf[i] = acum;
        }
        cdf[k - 1] = 1.0;

        Random rng = new Random(semilla);
        double[][] matrizReplicasPct = new double[k][rSim];

        for (int rep = 0; rep < rSim; rep++) {
            int[] conteoRep = new int[k];
            for (int persona = 0; persona < nSim; persona++) {
                double u = rng.nextDouble();
                int catIdx = 0;
                while (catIdx < k - 1 && u > cdf[catIdx]) {
                    catIdx++;
                }
                conteoRep[catIdx]++;
            }
            for (int i = 0; i < k; i++) {
                matrizReplicasPct[i][rep] = (conteoRep[i] * 100.0) / nSim;
            }
        }

        List<Map<String, Object>> resultadosCategorias = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < k; i++) {
            double[] muestras = matrizReplicasPct[i];
            Arrays.sort(muestras);

            double suma = 0.0;
            for (double v : muestras) {
                suma += v;
            }
            double mediaSimPct = suma / rSim;
            double ic95Inf = muestras[(int) Math.floor(0.025 * (rSim - 1))];
            double ic95Sup = muestras[(int) Math.floor(0.975 * (rSim - 1))];
            double obsPct = probObservada[i] * 100.0;
            double objPct = probEscenario[i] * 100.0;

            // Histograma de 10 bins de las réplicas para abrir al hacer clic en una categoría
            List<Map<String, Object>> histograma = construirHistogramaReplicas(muestras, 10);

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("categoria", categorias.get(i));
            item.put("observadoFrecuencia", ((Number) rows.get(i).get("frecuencia")).longValue());
            item.put("observadoPct", Math.round(obsPct * 10.0) / 10.0);
            item.put("objetivoPct", Math.round(objPct * 100.0) / 100.0);
            item.put("simuladoMediaPct", Math.round(mediaSimPct * 100.0) / 100.0);
            item.put("simuladoPersonasMedia", Math.round((mediaSimPct / 100.0) * nSim * 10.0) / 10.0);
            item.put("ic95InferiorPct", Math.round(ic95Inf * 100.0) / 100.0);
            item.put("ic95SuperiorPct", Math.round(ic95Sup * 100.0) / 100.0);
            item.put("diferenciaVsObservadoPct", Math.round((mediaSimPct - obsPct) * 100.0) / 100.0);
            item.put("histogramaReplicas", histograma);
            resultadosCategorias.add(item);
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("preguntaCodigo", preguntaCodigo);
        res.put("baseObservadaN", baseObservadaN);
        res.put("personasSimularN", nSim);
        res.put("replicasR", rSim);
        res.put("semilla", semilla);
        res.put("categorias", resultadosCategorias);
        return res;
    }

    private List<Map<String, Object>> construirHistogramaReplicas(double[] ordenados, int bins) {
        List<Map<String, Object>> hist = new ArrayList<Map<String, Object>>();
        double min = ordenados[0];
        double max = ordenados[ordenados.length - 1];
        double ancho = (max - min) > 1e-6 ? (max - min) / bins : 1.0;

        for (int b = 0; b < bins; b++) {
            double desde = min + b * ancho;
            double hasta = (b == bins - 1) ? max + 1e-6 : min + (b + 1) * ancho;
            int count = 0;
            for (double v : ordenados) {
                if (v >= desde && v < hasta) {
                    count++;
                }
            }
            Map<String, Object> binObj = new LinkedHashMap<String, Object>();
            binObj.put("desdePct", Math.round(desde * 100.0) / 100.0);
            binObj.put("hastaPct", Math.round(Math.min(100.0, hasta) * 100.0) / 100.0);
            binObj.put("replicas", count);
            hist.add(binObj);
        }
        return hist;
    }

    private String construirWhereTitulados(TituladosFiltroDTO f, List<Object> params) {
        if (f == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (f.getImportacionId() != null && f.getImportacionId() > 0) {
            sb.append(" AND r.importacion_id = ?");
            params.add(f.getImportacionId());
        }
        if (f.getAnioTitulacion() != null && f.getAnioTitulacion() > 0) {
            sb.append(" AND (EXTRACT(YEAR FROM COALESCE(r.fecha_envio, now())) - ROUND(COALESCE(sl.anios_vida_profesional, 0))) = ?");
            params.add(f.getAnioTitulacion());
        }
        if (f.getSituacion() != null && !f.getSituacion().isBlank() && !"Todos".equalsIgnoreCase(f.getSituacion())) {
            sb.append(" AND sl.situacion = ?");
            params.add(f.getSituacion());
        }
        if (f.getSector() != null && !f.getSector().isBlank() && !"Todos".equalsIgnoreCase(f.getSector())) {
            sb.append(" AND ea.sector = ?");
            params.add(f.getSector());
        }
        if (f.getGenero() != null && !f.getGenero().isBlank() && !"Todos".equalsIgnoreCase(f.getGenero())) {
            sb.append(" AND t.genero = ?");
            params.add(f.getGenero());
        }
        if (f.getEdadRango() != null && !f.getEdadRango().isBlank() && !"Todos".equalsIgnoreCase(f.getEdadRango())) {
            sb.append(" AND t.edad_rango = ?");
            params.add(f.getEdadRango());
        }
        if (f.getInteresadoPosgrado() != null) {
            sb.append(" AND fp.interesado = ?");
            params.add(f.getInteresadoPosgrado());
        }
        return sb.toString();
    }
}