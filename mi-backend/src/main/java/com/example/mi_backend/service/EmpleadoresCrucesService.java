package com.example.mi_backend.service;

import com.example.mi_backend.dto.EmpleadoresFiltroDTO;
import org.apache.commons.math3.distribution.TDistribution;
import org.apache.commons.math3.stat.correlation.SpearmansCorrelation;
import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.apache.commons.math3.stat.inference.MannWhitneyUTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

@Service
public class EmpleadoresCrucesService {

    private final JdbcTemplate jdbcTemplate;

    private static final Map<String, String> NIVEL_MEDICION = Map.ofEntries(
        Map.entry("EMP_TIPO_ORG", "DICOTOMICA"),
        Map.entry("EMP_CONTRATO_5", "DICOTOMICA"),
        Map.entry("EMP_TAMANO", "ORDINAL"),
        Map.entry("EMP_PROB_CONTRATACION", "ORDINAL"),
        Map.entry("EMP_NIVEL_DEMANDADO", "ORDINAL"),
        Map.entry("EMP_RUBRO", "NOMINAL"),
        Map.entry("EMP_MEDIO_CONVOCATORIA", "NOMINAL"),
        Map.entry("EMP_MULT_CARGOS", "MULTIPLE")
    );

    private static final Map<String, List<String>> ORDEN_FIJO_EMPLEADORES = Map.of(
        "EMP_TIPO_ORG", List.of("Público", "Privado"),
        "EMP_CONTRATO_5", List.of("SI", "NO"),
        "EMP_TAMANO", List.of(
            "Micro (hasta 10 funcionarios)",
            "Pequeña (entre 11 a 30 funcionarios)",
            "Mediana (entre 31 a 99 funcionarios)",
            "Grande (100 funcionarios o más)"
        ),
        "EMP_PROB_CONTRATACION", List.of(
            "No se tiene prevista la contratación actualmente",
            "Sí, dependiendo del crecimiento o nuevos proyectos de la organización",
            "Sí, existe una alta probabilidad de contratación"
        ),
        "EMP_NIVEL_DEMANDADO", List.of(
            "Licenciatura",
            "Diplomado",
            "Especialidad",
            "Maestría"
        )
    );

    public EmpleadoresCrucesService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listarVariablesCruzablesEmpleadores() {
        List<Map<String, Object>> preguntas = jdbcTemplate.queryForList(
            "SELECT codigo, dimension, etiqueta_corta, texto_forms, tipo " +
            "FROM public.pregunta WHERE encuesta = 'empleadores' ORDER BY dimension, codigo"
        );

        List<Map<String, Object>> resultado = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> p : preguntas) {
            String cod = String.valueOf(p.get("codigo"));
            String tipo = String.valueOf(p.get("tipo"));
            String nivel = "likert".equals(tipo) ? "ORDINAL" : NIVEL_MEDICION.getOrDefault(cod, "NOMINAL");

            Map<String, Object> item = new LinkedHashMap<String, Object>(p);
            item.put("nivelMedicion", nivel);
            resultado.add(item);
        }
        return resultado;
    }

    public Map<String, Object> calcularCruceEmpleadores(
            String varFila, String varColumna, EmpleadoresFiltroDTO f) {

        List<Object> params = new ArrayList<Object>();
        String whereFiltros = construirWhere(f, params);

        String exprFila = construirSubqueryVariable(varFila, "f");
        String exprCol = construirSubqueryVariable(varColumna, "c");

        List<Object> queryParams = new ArrayList<Object>();
        queryParams.add(varFila);
        queryParams.add(varColumna);
        queryParams.addAll(params);

        String sql = "SELECT f.valor AS fila, c.valor AS columna, COUNT(*) AS total " +
                     "FROM (" + exprFila + ") f " +
                     "JOIN (" + exprCol + ") c ON f.respuesta_id = c.respuesta_id " +
                     "JOIN public.empleador e ON e.id = f.respuesta_id " +
                     "JOIN public.respuesta r ON r.id = e.id " +
                     "WHERE r.tipo = 'empleador' " + whereFiltros +
                     " GROUP BY f.valor, c.valor";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, queryParams.toArray());
        if (rows.isEmpty()) {
            throw new IllegalStateException("No existen respuestas cruzadas para las variables y filtros seleccionados.");
        }

        List<String> catFila = ordenarCategorias(varFila, rows, "fila");
        List<String> catCol = ordenarCategorias(varColumna, rows, "columna");

        int rCount = catFila.size();
        int cCount = catCol.size();
        long[][] observados = new long[rCount][cCount];
        long[] totFila = new long[rCount];
        long[] totCol = new long[cCount];
        long granTotal = 0L;

        Map<String, Map<String, Long>> mapa = new HashMap<String, Map<String, Long>>();
        for (Map<String, Object> r : rows) {
            String fv = String.valueOf(r.get("fila"));
            String cv = String.valueOf(r.get("columna"));
            long cnt = ((Number) r.get("total")).longValue();
            mapa.computeIfAbsent(fv, k -> new HashMap<String, Long>()).put(cv, cnt);
        }

        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                long v = mapa.getOrDefault(catFila.get(i), Collections.<String, Long>emptyMap()).getOrDefault(catCol.get(j), 0L);
                observados[i][j] = v;
                totFila[i] += v;
                totCol[j] += v;
                granTotal += v;
            }
        }

        // Frecuencias esperadas y residuos ajustados de Haberman (z_ij)
        double[][] esperados = new double[rCount][cCount];
        double[][] residuosAjustados = new double[rCount][cCount];
        int celdasEsperadaMenor5 = 0;

        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                double exp = granTotal > 0 ? (double) (totFila[i] * totCol[j]) / granTotal : 0.0;
                esperados[i][j] = Math.round(exp * 100.0) / 100.0;
                if (exp < 5.0) {
                    celdasEsperadaMenor5++;
                }

                double propFila = granTotal > 0 ? (double) totFila[i] / granTotal : 0.0;
                double propCol = granTotal > 0 ? (double) totCol[j] / granTotal : 0.0;
                double denom = Math.sqrt(exp * (1.0 - propFila) * (1.0 - propCol));
                double zAdj = denom > 1e-9 ? (observados[i][j] - exp) / denom : 0.0;
                residuosAjustados[i][j] = Math.round(zAdj * 100.0) / 100.0;
            }
        }

        List<Map<String, Object>> filasDetalle = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < rCount; i++) {
            List<Map<String, Object>> celdas = new ArrayList<Map<String, Object>>();
            for (int j = 0; j < cCount; j++) {
                long val = observados[i][j];
                double pctFila = totFila[i] > 0 ? Math.round((val * 1000.0) / totFila[i]) / 10.0 : 0.0;
                double pctCol = totCol[j] > 0 ? Math.round((val * 1000.0) / totCol[j]) / 10.0 : 0.0;
                double pctTotal = granTotal > 0 ? Math.round((val * 1000.0) / granTotal) / 10.0 : 0.0;

                Map<String, Object> celda = new LinkedHashMap<String, Object>();
                celda.put("columna", catCol.get(j));
                celda.put("frecuencia", val);
                celda.put("porcentajeFila", pctFila);
                celda.put("porcentajeColumna", pctCol);
                celda.put("porcentajeTotal", pctTotal);
                celda.put("residuoAjustado", residuosAjustados[i][j]);
                celdas.add(celda);
            }

            Map<String, Object> filaObj = new LinkedHashMap<String, Object>();
            filaObj.put("etiqueta", catFila.get(i));
            filaObj.put("nFila", totFila[i]);
            filaObj.put("porcentajeSobreTotal", granTotal > 0 ? Math.round((totFila[i] * 1000.0) / granTotal) / 10.0 : 0.0);
            filaObj.put("celdas", celdas);
            filasDetalle.add(filaObj);
        }

        List<Double> pctTotalesColumna = new ArrayList<Double>();
        for (int j = 0; j < cCount; j++) {
            pctTotalesColumna.add(granTotal > 0 ? Math.round((totCol[j] * 1000.0) / granTotal) / 10.0 : 0.0);
        }

        String nivelFila = obtenerNivelMedicion(varFila);
        String nivelCol = obtenerNivelMedicion(varColumna);
        Map<String, Object> prueba = seleccionarYCalcularPrueba(
            observados, totFila, totCol, (int) granTotal, celdasEsperadaMenor5, nivelFila, nivelCol
        );

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("variableFila", varFila);
        res.put("variableColumna", varColumna);
        res.put("nivelFila", nivelFila);
        res.put("nivelColumna", nivelCol);
        res.put("categoriasFila", catFila);
        res.put("categoriasColumna", catCol);
        res.put("filas", filasDetalle);
        res.put("observados", observados);
        res.put("esperados", esperados);
        res.put("residuosAjustados", residuosAjustados);
        res.put("totalesFila", totFila);
        res.put("totalesColumna", totCol);
        res.put("porcentajesColumna", pctTotalesColumna);
        res.put("totalN", granTotal);
        res.put("prueba", prueba);
        return res;
    }

    private Map<String, Object> seleccionarYCalcularPrueba(
            long[][] obs, long[] totFila, long[] totCol, int n,
            int celdasMenor5, String nivelFila, String nivelCol) {

        int rCount = obs.length;
        int cCount = rCount > 0 ? obs[0].length : 0;

        // Caso 1: Dicotómica (2 grupos) vs Ordinal -> U de Mann-Whitney + Correlación biserial de rangos
        if ("DICOTOMICA".equals(nivelFila) && "ORDINAL".equals(nivelCol) && rCount == 2 && cCount >= 2) {
            return calcularMannWhitneyDesdeTabla(obs, false);
        }
        if ("ORDINAL".equals(nivelFila) && "DICOTOMICA".equals(nivelCol) && cCount == 2 && rCount >= 2) {
            return calcularMannWhitneyDesdeTabla(obs, true);
        }

        // Caso 2: Ordinal vs Ordinal -> rho de Spearman
        if ("ORDINAL".equals(nivelFila) && "ORDINAL".equals(nivelCol) && rCount >= 2 && cCount >= 2) {
            return calcularSpearmanDesdeTabla(obs);
        }

        // Caso 3: Nominal / Dicotómica vs Nominal (o con celdas esperadas < 5 -> Fisher-Freeman-Halton)
        double chi2 = 0.0;
        double pValorChi2 = 1.0;
        int gl = Math.max(1, (rCount - 1) * (cCount - 1));
        double vCramer = 0.0;

        if (rCount >= 2 && cCount >= 2 && n > 0) {
            ChiSquareTest chiTest = new ChiSquareTest();
            chi2 = chiTest.chiSquare(obs);
            pValorChi2 = chiTest.chiSquareTest(obs);
            int minDim = Math.min(rCount - 1, cCount - 1);
            vCramer = minDim > 0 ? Math.sqrt(chi2 / (n * minDim)) : 0.0;
        }

        boolean usarFisher = celdasMenor5 > 0;
        double pValorFisher = usarFisher
            ? calcularFisherFreemanHaltonMonteCarlo(obs, totFila, totCol, n, 10000)
            : pValorChi2;

        double pFinal = usarFisher ? pValorFisher : pValorChi2;
        String mag = vCramer < 0.1 ? "Despreciable" : (vCramer < 0.3 ? "Pequeña" : (vCramer < 0.5 ? "Moderada" : "Grande"));

        Map<String, Object> p = new LinkedHashMap<String, Object>();
        p.put("nombre", usarFisher ? "Fisher-Freeman-Halton (Monte Carlo)" : "Chi-cuadrado de Pearson");
        p.put("pValor", Math.round(pFinal * 1000.0) / 1000.0);
        p.put("estadisticoNombre", "Chi^2");
        p.put("estadisticoValor", Math.round(chi2 * 100.0) / 100.0);
        p.put("gradosLibertad", gl);
        p.put("efectoNombre", "V de Cramér");
        p.put("efectoValor", Math.round(vCramer * 1000.0) / 1000.0);
        p.put("magnitudEfecto", mag);
        p.put("celdasEsperadaMenor5", celdasMenor5);
        p.put("totalCeldas", rCount * cCount);
        p.put("significativo", pFinal < 0.05);
        return p;
    }

    private Map<String, Object> calcularMannWhitneyDesdeTabla(long[][] obs, boolean transponer) {
        List<Double> g1 = new ArrayList<Double>();
        List<Double> g2 = new ArrayList<Double>();

        if (!transponer) {
            for (int j = 0; j < obs[0].length; j++) {
                for (long k = 0; k < obs[0][j]; k++) {
                    g1.add((double) (j + 1));
                }
                for (long k = 0; k < obs[1][j]; k++) {
                    g2.add((double) (j + 1));
                }
            }
        } else {
            for (int i = 0; i < obs.length; i++) {
                for (long k = 0; k < obs[i][0]; k++) {
                    g1.add((double) (i + 1));
                }
                for (long k = 0; k < obs[i][1]; k++) {
                    g2.add((double) (i + 1));
                }
            }
        }

        double[] x = g1.stream().mapToDouble(Double::doubleValue).toArray();
        double[] y = g2.stream().mapToDouble(Double::doubleValue).toArray();

        double u = 0.0;
        double pValor = 1.0;
        double rBiserial = 0.0;

        if (x.length > 0 && y.length > 0) {
            MannWhitneyUTest mw = new MannWhitneyUTest();
            double u1 = mw.mannWhitneyU(x, y);
            double u2 = (double) (x.length * y.length) - u1;
            u = Math.max(u1, u2);
            pValor = mw.mannWhitneyUTest(x, y);
            rBiserial = Math.abs((2.0 * u) / (x.length * y.length) - 1.0);
        }

        String mag = rBiserial < 0.1 ? "Despreciable" : (rBiserial < 0.3 ? "Pequeña" : (rBiserial < 0.5 ? "Moderada" : "Grande"));

        Map<String, Object> p = new LinkedHashMap<String, Object>();
        p.put("nombre", "U de Mann-Whitney");
        p.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        p.put("estadisticoNombre", "U");
        p.put("estadisticoValor", Math.round(u * 10.0) / 10.0);
        p.put("efectoNombre", "Correlación biserial de rangos");
        p.put("efectoValor", Math.round(rBiserial * 1000.0) / 1000.0);
        p.put("magnitudEfecto", mag);
        p.put("significativo", pValor < 0.05);
        return p;
    }

    private Map<String, Object> calcularSpearmanDesdeTabla(long[][] obs) {
        List<Double> xList = new ArrayList<Double>();
        List<Double> yList = new ArrayList<Double>();

        for (int i = 0; i < obs.length; i++) {
            for (int j = 0; j < obs[0].length; j++) {
                for (long k = 0; k < obs[i][j]; k++) {
                    xList.add((double) (i + 1));
                    yList.add((double) (j + 1));
                }
            }
        }

        double rho = 0.0;
        double pValor = 1.0;
        int n = xList.size();

        if (n >= 4) {
            SpearmansCorrelation sc = new SpearmansCorrelation();
            rho = sc.correlation(
                xList.stream().mapToDouble(Double::doubleValue).toArray(),
                yList.stream().mapToDouble(Double::doubleValue).toArray()
            );
            if (Double.isNaN(rho)) {
                rho = 0.0;
            }
            if (Math.abs(rho) >= 0.999999) {
                pValor = 0.0;
            } else {
                double tStat = Math.abs(rho) * Math.sqrt((n - 2.0) / (1.0 - rho * rho));
                TDistribution tDist = new TDistribution(n - 2.0);
                pValor = 2.0 * (1.0 - tDist.cumulativeProbability(tStat));
            }
        }

        String mag = Math.abs(rho) < 0.1 ? "Despreciable" : (Math.abs(rho) < 0.3 ? "Pequeña" : (Math.abs(rho) < 0.5 ? "Moderada" : "Grande"));

        Map<String, Object> p = new LinkedHashMap<String, Object>();
        p.put("nombre", "rho de Spearman");
        p.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        p.put("estadisticoNombre", "rho");
        p.put("estadisticoValor", Math.round(rho * 1000.0) / 1000.0);
        p.put("efectoNombre", "rho de Spearman");
        p.put("efectoValor", Math.round(rho * 1000.0) / 1000.0);
        p.put("magnitudEfecto", mag);
        p.put("significativo", pValor < 0.05);
        return p;
    }

    private double calcularFisherFreemanHaltonMonteCarlo(
            long[][] obs, long[] totFila, long[] totCol, int n, int iteraciones) {

        if (n <= 0 || obs.length < 2 || obs[0].length < 2) {
            return 1.0;
        }

        double[] logFact = new double[n + 1];
        for (int i = 1; i <= n; i++) {
            logFact[i] = logFact[i - 1] + Math.log(i);
        }

        double logProbObs = 0.0;
        for (long[] fila : obs) {
            for (long val : fila) {
                logProbObs -= logFact[(int) val];
            }
        }

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

            double logProbPerm = 0.0;
            for (long[] fila : tablaPerm) {
                for (long val : fila) {
                    logProbPerm -= logFact[(int) val];
                }
            }

            if (logProbPerm <= logProbObs + 1e-9) {
                extremos++;
            }
        }

        return (double) extremos / iteraciones;
    }

    private String construirSubqueryVariable(String codigo, String alias) {
        if ("EMP_MULT_CARGOS".equals(codigo)) {
            return "SELECT rm.respuesta_id, COALESCE(o.valor, rm.otro_texto) AS valor " +
                   "FROM public.respuesta_multiple rm " +
                   "LEFT JOIN public.opcion o ON o.id = rm.opcion_id " +
                   "WHERE rm.pregunta_codigo = ?";
        }
        return "SELECT respuesta_id, valor FROM public.vw_empleadores_variables WHERE pregunta_codigo = ?";
    }

    private List<String> ordenarCategorias(String codigo, List<Map<String, Object>> rows, String key) {
        Set<String> presentes = new LinkedHashSet<String>();
        for (Map<String, Object> r : rows) {
            presentes.add(String.valueOf(r.get(key)));
        }

        if (ORDEN_FIJO_EMPLEADORES.containsKey(codigo)) {
            List<String> ordenadas = new ArrayList<String>();
            for (String cat : ORDEN_FIJO_EMPLEADORES.get(codigo)) {
                if (presentes.contains(cat)) {
                    ordenadas.add(cat);
                }
            }
            for (String extra : presentes) {
                if (!ordenadas.contains(extra)) {
                    ordenadas.add(extra);
                }
            }
            return ordenadas;
        }

        List<String> ordenOpcion = jdbcTemplate.queryForList(
            "SELECT valor FROM public.opcion WHERE pregunta_codigo = ? ORDER BY orden ASC",
            String.class, codigo
        );
        if (!ordenOpcion.isEmpty()) {
            List<String> ordenadas = new ArrayList<String>();
            for (String cat : ordenOpcion) {
                if (presentes.contains(cat)) {
                    ordenadas.add(cat);
                }
            }
            for (String extra : presentes) {
                if (!ordenadas.contains(extra)) {
                    ordenadas.add(extra);
                }
            }
            return ordenadas;
        }

        return new ArrayList<String>(presentes);
    }

    private String obtenerNivelMedicion(String codigo) {
        if (NIVEL_MEDICION.containsKey(codigo)) {
            return NIVEL_MEDICION.get(codigo);
        }
        if (codigo.startsWith("EMP_LIKERT_")) {
            return "ORDINAL";
        }
        return "NOMINAL";
    }

    private String construirWhere(EmpleadoresFiltroDTO f, List<Object> params) {
        if (f == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (f.getImportacionId() != null && f.getImportacionId() > 0) {
            sb.append(" AND r.importacion_id = ?");
            params.add(f.getImportacionId());
        }
        if (f.getTipoOrganizacion() != null && !f.getTipoOrganizacion().isBlank() && !"Todos".equalsIgnoreCase(f.getTipoOrganizacion())) {
            sb.append(" AND e.tipo_organizacion = ?");
            params.add(f.getTipoOrganizacion());
        }
        if (f.getTamano() != null && !f.getTamano().isBlank() && !"Todos".equalsIgnoreCase(f.getTamano())) {
            sb.append(" AND e.tamano = ?");
            params.add(f.getTamano());
        }
        if (f.getRubro() != null && !f.getRubro().isBlank() && !"Todos".equalsIgnoreCase(f.getRubro())) {
            sb.append(" AND e.rubro = ?");
            params.add(f.getRubro());
        }
        if (f.getContratoUltimos5() != null) {
            sb.append(" AND e.contrato_ultimos_5 = ?");
            params.add(f.getContratoUltimos5());
        }
        if (f.getProbContratacion() != null && !f.getProbContratacion().isBlank() && !"Todos".equalsIgnoreCase(f.getProbContratacion())) {
            sb.append(" AND e.prob_contratacion = ?");
            params.add(f.getProbContratacion());
        }
        return sb.toString();
    }
}