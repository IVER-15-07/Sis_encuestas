package com.example.mi_backend.service;

import com.example.mi_backend.dto.TituladosFiltroDTO;
import org.apache.commons.math3.distribution.ChiSquaredDistribution;
import org.apache.commons.math3.distribution.TDistribution;
import org.apache.commons.math3.stat.correlation.SpearmansCorrelation;
import org.apache.commons.math3.stat.ranking.NaNStrategy;
import org.apache.commons.math3.stat.ranking.NaturalRanking;
import org.apache.commons.math3.stat.ranking.TiesStrategy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class BrechasCompetenciasService {

    private final JdbcTemplate jdbcTemplate;

    private static final List<String> ESCALA_LIKERT_4 = List.of(
        "Totalmente en desacuerdo",
        "En desacuerdo",
        "De acuerdo",
        "Totalmente de Acuerdo"
    );

    private static final List<String> ORDEN_SITUACION = List.of(
        "Actualmente me encuentro trabajando un una organización",
        "Actualmente dedico mi tiempo COMPLETO a un emprendimiento propio",
        "Actualmente NO trabajo"
    );

    private static final Map<String, String> ETIQUETAS_SITUACION = Map.of(
        "Actualmente me encuentro trabajando un una organización", "Trabaja en una organización",
        "Actualmente dedico mi tiempo COMPLETO a un emprendimiento propio", "Emprendimiento propio",
        "Actualmente NO trabajo", "En búsqueda laboral"
    );

    public BrechasCompetenciasService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> obtenerBrechasCompetencias(TituladosFiltroDTO f) {
        List<Object> params = new ArrayList<Object>();
        String where = construirWhere(f, params);

        long totalUniverso = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.respuesta r WHERE r.tipo = 'titulado'" +
            (f.getImportacionId() != null && f.getImportacionId() > 0 ? " AND r.importacion_id = " + f.getImportacionId() : ""),
            Long.class
        );

        long totalFiltrado = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.respuesta r " +
            "JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' " + where,
            Long.class, params.toArray()
        );

        Map<String, Object> resultado = new LinkedHashMap<String, Object>();
        resultado.put("totalUniverso", totalUniverso);
        resultado.put("totalFiltrado", totalFiltrado);
        resultado.put("tabSatisfaccionPertinencia", construirTabSatisfaccionPertinencia(where, params));
        resultado.put("tabMallaAsignaturas", construirTabMallaAsignaturas(where, params));
        return resultado;
    }

    private Map<String, Object> construirTabSatisfaccionPertinencia(String where, List<Object> params) {
        Map<String, Object> satGlobal = calcularIndicadorLikert4(
            "TIT_LIKERT_SATISFACCION_GLOBAL",
            "Valoración global de la formación",
            where,
            params
        );
        Map<String, Object> concordancia = calcularIndicadorLikert4(
            "TIT_LIKERT_CONCORDANCIA_MERCADO",
            "Concordancia con los requerimientos del mercado",
            where,
            params
        );
        Map<String, Object> pertinencia = calcularIndicadorLikert4(
            "TIT_LIKERT_PERTINENCIA_PUESTO",
            "Pertinencia del trabajo respecto a la formación",
            where,
            params
        );

        Map<String, Object> cruceSatConcordancia = calcularCruceOrdinalSpearman(
            "TIT_LIKERT_SATISFACCION_GLOBAL",
            "TIT_LIKERT_CONCORDANCIA_MERCADO",
            "Valoración global de la formación",
            "Concordancia formación - requerimientos",
            where,
            params
        );

        Map<String, Object> cruceSituacionSat = calcularCruceSituacionVsSatisfaccion(where, params);

        Map<String, Object> cruceSatPertinencia = calcularCruceOrdinalSpearman(
            "TIT_LIKERT_SATISFACCION_GLOBAL",
            "TIT_LIKERT_PERTINENCIA_PUESTO",
            "Valoración global de la formación",
            "Pertinencia del trabajo con la formación",
            where,
            params
        );

        Map<String, Object> tab = new LinkedHashMap<String, Object>();
        tab.put("valoracionGlobal", satGlobal);
        tab.put("concordanciaMercado", concordancia);
        tab.put("pertinenciaTrabajo", pertinencia);
        tab.put("cruceGlobalConcordancia", cruceSatConcordancia);
        tab.put("cruceSituacionGlobal", cruceSituacionSat);
        tab.put("cruceGlobalPertinencia", cruceSatPertinencia);
        return tab;
    }

    private Map<String, Object> calcularIndicadorLikert4(
            String preguntaCodigo, String titulo, String where, List<Object> baseParams) {

        List<Object> p = new ArrayList<Object>();
        p.add(preguntaCodigo);
        p.addAll(baseParams);

        String sql = "SELECT o.valor AS categoria, o.orden, o.puntaje, COUNT(*) AS frecuencia " +
                     "FROM public.respuesta_likert rl " +
                     "JOIN public.opcion o ON o.id = rl.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rl.respuesta_id " +
                     "JOIN public.titulado t ON t.id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "WHERE rl.pregunta_codigo = ? " + where +
                     " GROUP BY o.valor, o.orden, o.puntaje ORDER BY o.orden ASC";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, p.toArray());
        Map<String, Long> conteoPorValor = new HashMap<String, Long>();
        for (Map<String, Object> row : rows) {
            conteoPorValor.put(String.valueOf(row.get("categoria")), ((Number) row.get("frecuencia")).longValue());
        }

        long n = conteoPorValor.values().stream().mapToLong(Long::longValue).sum();
        long desfCount = 0L;
        long favCount = 0L;
        double sumaPuntajes = 0.0;

        List<Map<String, Object>> niveles = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < ESCALA_LIKERT_4.size(); i++) {
            String cat = ESCALA_LIKERT_4.get(i);
            int orden = i + 1;
            long freq = conteoPorValor.getOrDefault(cat, 0L);
            double pct = n > 0 ? Math.round((freq * 1000.0) / n) / 10.0 : 0.0;

            if (orden <= 2) {
                desfCount += freq;
            } else {
                favCount += freq;
            }
            sumaPuntajes += orden * freq;

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("categoria", cat);
            item.put("orden", orden);
            item.put("frecuencia", freq);
            item.put("porcentaje", pct);
            niveles.add(item);
        }

        double desfPct = n > 0 ? Math.round((desfCount * 1000.0) / n) / 10.0 : 0.0;
        double favPct = n > 0 ? Math.round((favCount * 1000.0) / n) / 10.0 : 0.0;
        double media = n > 0 ? Math.round((sumaPuntajes / n) * 100.0) / 100.0 : 0.0;

        String diagnostico;
        if (favPct >= 75.0 && desfPct < 15.0) {
            diagnostico = "La valoración favorable es predominante.";
        } else if (desfPct >= 20.0) {
            diagnostico = "Existe una proporción desfavorable que requiere seguimiento.";
        } else {
            diagnostico = "Valoración mayoritariamente favorable con margen de mejora.";
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("preguntaCodigo", preguntaCodigo);
        res.put("titulo", titulo);
        res.put("n", n);
        res.put("desfavorableCount", desfCount);
        res.put("desfavorablePct", desfPct);
        res.put("intermediaPct", 0.0);
        res.put("favorableCount", favCount);
        res.put("favorablePct", favPct);
        res.put("media", media);
        res.put("diagnostico", diagnostico);
        res.put("niveles", niveles);
        return res;
    }

    private Map<String, Object> calcularCruceOrdinalSpearman(
            String codFila, String codCol, String tituloFila, String tituloCol,
            String where, List<Object> baseParams) {

        List<Object> p = new ArrayList<Object>();
        p.add(codFila);
        p.add(codCol);
        p.addAll(baseParams);

        String sql = "SELECT oa.valor AS fila_val, oa.puntaje AS fila_pts, " +
                     "ob.valor AS col_val, ob.puntaje AS col_pts " +
                     "FROM public.respuesta_likert rla " +
                     "JOIN public.opcion oa ON oa.id = rla.opcion_id " +
                     "JOIN public.respuesta_likert rlb ON rlb.respuesta_id = rla.respuesta_id " +
                     "JOIN public.opcion ob ON ob.id = rlb.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rla.respuesta_id " +
                     "JOIN public.titulado t ON t.id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "WHERE rla.pregunta_codigo = ? AND rlb.pregunta_codigo = ? " + where;

        List<Map<String, Object>> pares = jdbcTemplate.queryForList(sql, p.toArray());

        long[][] matriz = new long[4][4];
        long[] totFila = new long[4];
        long[] totCol = new long[4];
        double[] xVals = new double[pares.size()];
        double[] yVals = new double[pares.size()];

        for (int idx = 0; idx < pares.size(); idx++) {
            Map<String, Object> row = pares.get(idx);
            int ptsX = ((Number) row.get("fila_pts")).intValue();
            int ptsY = ((Number) row.get("col_pts")).intValue();
            int i = Math.max(0, Math.min(3, ptsX - 1));
            int j = Math.max(0, Math.min(3, ptsY - 1));
            matriz[i][j]++;
            totFila[i]++;
            totCol[j]++;
            xVals[idx] = ptsX;
            yVals[idx] = ptsY;
        }

        long n = pares.size();
        double rho = 0.0;
        double pValor = 1.0;

        if (n >= 4) {
            SpearmansCorrelation spearman = new SpearmansCorrelation();
            rho = spearman.correlation(xVals, yVals);
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

        List<Map<String, Object>> filasFormateadas = construirFilasMatrizPorcentaje(ESCALA_LIKERT_4, ESCALA_LIKERT_4, matriz, totFila);

        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", "rho de Spearman");
        prueba.put("rho", Math.round(rho * 100.0) / 100.0);
        prueba.put("pValor", Math.round(pValor * 10000.0) / 10000.0);
        prueba.put("significativo", pValor < 0.05);

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("tituloFila", tituloFila);
        res.put("tituloColumna", tituloCol);
        res.put("columnas", ESCALA_LIKERT_4);
        res.put("filas", filasFormateadas);
        res.put("totalesColumna", totCol);
        res.put("n", n);
        res.put("prueba", prueba);
        return res;
    }

    private Map<String, Object> calcularCruceSituacionVsSatisfaccion(String where, List<Object> baseParams) {
        List<Object> p = new ArrayList<Object>();
        p.add("TIT_LIKERT_SATISFACCION_GLOBAL");
        p.addAll(baseParams);

        String sql = "SELECT sl.situacion, o.puntaje " +
                     "FROM public.respuesta_likert rl " +
                     "JOIN public.opcion o ON o.id = rl.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rl.respuesta_id " +
                     "JOIN public.titulado t ON t.id = r.id " +
                     "JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "WHERE rl.pregunta_codigo = ? AND sl.situacion IS NOT NULL " + where;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, p.toArray());

        long[][] matriz = new long[3][4];
        long[] totFila = new long[3];
        long[] totCol = new long[4];

        for (Map<String, Object> row : rows) {
            String sit = String.valueOf(row.get("situacion"));
            int pts = ((Number) row.get("puntaje")).intValue();
            int i = ORDEN_SITUACION.indexOf(sit);
            if (i < 0) continue;
            int j = Math.max(0, Math.min(3, pts - 1));
            matriz[i][j]++;
            totFila[i]++;
            totCol[j]++;
        }

        List<String> etiquetasFilas = new ArrayList<String>();
        for (String cod : ORDEN_SITUACION) {
            etiquetasFilas.add(ETIQUETAS_SITUACION.getOrDefault(cod, cod));
        }

        Map<String, Object> kw = calcularKruskalWallisConMonteCarlo(matriz, 10000);
        List<Map<String, Object>> filasFormateadas = construirFilasMatrizPorcentaje(etiquetasFilas, ESCALA_LIKERT_4, matriz, totFila);

        long n = Arrays.stream(totFila).sum();
        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("tituloFila", "Estado laboral");
        res.put("tituloColumna", "Valoración global de la formación");
        res.put("columnas", ESCALA_LIKERT_4);
        res.put("filas", filasFormateadas);
        res.put("totalesColumna", totCol);
        res.put("n", n);
        res.put("prueba", kw);
        return res;
    }

    private Map<String, Object> construirTabMallaAsignaturas(String where, List<Object> params) {
        Map<String, Object> utiles = obtenerRankingMultiple("TIT_MULT_ASPECTOS_UTILES", where, params);
        Map<String, Object> mejorar = obtenerRankingMultiple("TIT_MULT_ASPECTOS_MEJORAR", where, params);

        Map<String, Object> ventaja = obtenerRankingMultiple("TIT_MULT_ASIG_VENTAJA", where, params);
        Map<String, Object> noUtil = obtenerRankingMultiple("TIT_MULT_ASIG_NO_UTIL", where, params);

        long nVentaja = ((Number) ventaja.get("n")).longValue();
        long nNoUtil = ((Number) noUtil.get("n")).longValue();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> listaVentaja = (List<Map<String, Object>>) ventaja.get("items");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> listaNoUtil = (List<Map<String, Object>>) noUtil.get("items");

        Map<String, String> nombreCanonico = new LinkedHashMap<String, String>();
        Map<String, Long> freqVentaja = new HashMap<String, Long>();
        Map<String, Long> freqNoUtil = new HashMap<String, Long>();

        for (Map<String, Object> item : listaVentaja) {
            String nombre = String.valueOf(item.get("categoria"));
            String clave = normalizarClaveSinAcentos(nombre);
            nombreCanonico.putIfAbsent(clave, nombre);
            freqVentaja.merge(clave, ((Number) item.get("frecuencia")).longValue(), Long::sum);
        }

        for (Map<String, Object> item : listaNoUtil) {
            String nombre = String.valueOf(item.get("categoria"));
            String clave = normalizarClaveSinAcentos(nombre);
            nombreCanonico.putIfAbsent(clave, nombre);
            freqNoUtil.merge(clave, ((Number) item.get("frecuencia")).longValue(), Long::sum);
        }

        List<Map<String, Object>> matrizAsignaturas = new ArrayList<Map<String, Object>>();
        for (Map.Entry<String, String> entry : nombreCanonico.entrySet()) {
            String clave = entry.getKey();
            String nombre = entry.getValue();
            long fv = freqVentaja.getOrDefault(clave, 0L);
            long fn = freqNoUtil.getOrDefault(clave, 0L);
            double pctV = nVentaja > 0 ? Math.round((fv * 1000.0) / nVentaja) / 10.0 : 0.0;
            double pctN = nNoUtil > 0 ? Math.round((fn * 1000.0) / nNoUtil) / 10.0 : 0.0;

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("asignatura", nombre);
            fila.put("ventajaCount", fv);
            fila.put("ventajaPct", pctV);
            fila.put("pocoUtilCount", fn);
            fila.put("pocoUtilPct", pctN);
            fila.put("totalMenciones", fv + fn);
            matrizAsignaturas.add(fila);
        }

        matrizAsignaturas.sort((a, b) -> {
            int cmp = Long.compare(((Number) b.get("totalMenciones")).longValue(), ((Number) a.get("totalMenciones")).longValue());
            if (cmp != 0) return cmp;
            return Long.compare(((Number) b.get("ventajaCount")).longValue(), ((Number) a.get("ventajaCount")).longValue());
        });

        Map<String, Object> tab = new LinkedHashMap<String, Object>();
        tab.put("senalesUtilidad", utiles);
        tab.put("prioridadesMejora", mejorar);
        tab.put("nVentaja", nVentaja);
        tab.put("nActualizacion", nNoUtil);
        tab.put("matrizAsignaturas", matrizAsignaturas);
        return tab;
    }

    private Map<String, Object> obtenerRankingMultiple(String preguntaCodigo, String where, List<Object> baseParams) {
        List<Object> pCount = new ArrayList<Object>();
        pCount.add(preguntaCodigo);
        pCount.addAll(baseParams);

        String sqlN = "SELECT COUNT(DISTINCT rm.respuesta_id) " +
                      "FROM public.respuesta_multiple rm " +
                      "JOIN public.respuesta r ON r.id = rm.respuesta_id " +
                      "JOIN public.titulado t ON t.id = r.id " +
                      "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                      "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                      "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                      "WHERE rm.pregunta_codigo = ? " + where;

        Long nObj = jdbcTemplate.queryForObject(sqlN, Long.class, pCount.toArray());
        long n = nObj != null ? nObj : 0L;

        String sqlItems = "SELECT COALESCE(o.valor, rm.otro_texto) AS categoria, COUNT(DISTINCT rm.respuesta_id) AS frecuencia " +
                          "FROM public.respuesta_multiple rm " +
                          "JOIN public.respuesta r ON r.id = rm.respuesta_id " +
                          "JOIN public.titulado t ON t.id = r.id " +
                          "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                          "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                          "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                          "LEFT JOIN public.opcion o ON o.id = rm.opcion_id " +
                          "WHERE rm.pregunta_codigo = ? AND COALESCE(o.valor, rm.otro_texto) IS NOT NULL " + where +
                          " GROUP BY COALESCE(o.valor, rm.otro_texto) ORDER BY frecuencia DESC";

        List<Map<String, Object>> items = jdbcTemplate.queryForList(sqlItems, pCount.toArray());
        for (Map<String, Object> item : items) {
            long f = ((Number) item.get("frecuencia")).longValue();
            item.put("porcentaje", n > 0 ? Math.round((f * 1000.0) / n) / 10.0 : 0.0);
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("n", n);
        res.put("items", items);
        return res;
    }

    private List<Map<String, Object>> construirFilasMatrizPorcentaje(
            List<String> etiquetasFila, List<String> etiquetasCol, long[][] matriz, long[] totFila) {

        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < etiquetasFila.size(); i++) {
            List<Map<String, Object>> celdas = new ArrayList<Map<String, Object>>();
            for (int j = 0; j < etiquetasCol.size(); j++) {
                long val = matriz[i][j];
                double pct = totFila[i] > 0 ? Math.round((val * 1000.0) / totFila[i]) / 10.0 : 0.0;
                Map<String, Object> celda = new LinkedHashMap<String, Object>();
                celda.put("columna", etiquetasCol.get(j));
                celda.put("frecuencia", val);
                celda.put("porcentajeFila", pct);
                celdas.add(celda);
            }
            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("etiqueta", etiquetasFila.get(i));
            fila.put("nFila", totFila[i]);
            fila.put("celdas", celdas);
            filas.add(fila);
        }
        return filas;
    }

    private Map<String, Object> calcularKruskalWallisConMonteCarlo(long[][] observados, int iteraciones) {
        int rCount = observados.length;
        int cCount = rCount > 0 ? observados[0].length : 0;

        List<Integer> grupos = new ArrayList<Integer>();
        List<Double> valores = new ArrayList<Double>();

        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                for (long k = 0; k < observados[i][j]; k++) {
                    grupos.add(i);
                    valores.add((double) (j + 1));
                }
            }
        }

        int n = valores.size();
        if (n < 5 || cCount < 2) {
            Map<String, Object> vacio = new LinkedHashMap<String, Object>();
            vacio.put("nombre", "H de Kruskal-Wallis");
            vacio.put("h", 0.0);
            vacio.put("gl", 0);
            vacio.put("pValor", 1.0);
            vacio.put("epsilonCuadrado", 0.0);
            vacio.put("significativo", false);
            return vacio;
        }

        double[] arrVals = valores.stream().mapToDouble(Double::doubleValue).toArray();
        int[] arrGrupos = grupos.stream().mapToInt(Integer::intValue).toArray();

        NaturalRanking ranking = new NaturalRanking(NaNStrategy.REMOVED, TiesStrategy.AVERAGE);
        double[] rangos = ranking.rank(arrVals);

        Map<Double, Long> freqTies = new HashMap<Double, Long>();
        for (double v : arrVals) {
            freqTies.merge(v, 1L, Long::sum);
        }
        double sumTies = 0.0;
        for (long t : freqTies.values()) {
            if (t > 1) {
                sumTies += (Math.pow(t, 3) - t);
            }
        }
        double factorEmpates = 1.0 - (sumTies / (Math.pow(n, 3) - n));

        double hObservado = calcularEstadisticoH(rangos, arrGrupos, rCount, factorEmpates);
        int gl = (int) Arrays.stream(arrGrupos).distinct().count() - 1;
        double epsilon2 = hObservado / (n - 1.0);

        int[] conteoGrupo = new int[rCount];
        for (int g : arrGrupos) {
            conteoGrupo[g]++;
        }
        boolean usarMonteCarlo = Arrays.stream(conteoGrupo).filter(c -> c > 0).anyMatch(c -> c < 5);

        double pValor;
        if (usarMonteCarlo) {
            int mayoresOIguales = 0;
            int[] permGrupos = Arrays.copyOf(arrGrupos, n);
            Random rnd = ThreadLocalRandom.current();
            for (int it = 0; it < iteraciones; it++) {
                for (int idx = n - 1; idx > 0; idx--) {
                    int swap = rnd.nextInt(idx + 1);
                    int tmp = permGrupos[idx];
                    permGrupos[idx] = permGrupos[swap];
                    permGrupos[swap] = tmp;
                }
                double hPerm = calcularEstadisticoH(rangos, permGrupos, rCount, factorEmpates);
                if (hPerm >= hObservado - 1e-9) {
                    mayoresOIguales++;
                }
            }
            pValor = (double) mayoresOIguales / iteraciones;
        } else {
            ChiSquaredDistribution chiDist = new ChiSquaredDistribution(Math.max(1, gl));
            pValor = 1.0 - chiDist.cumulativeProbability(Math.max(0.0, hObservado));
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("nombre", "H de Kruskal-Wallis");
        res.put("h", Math.round(hObservado * 100.0) / 100.0);
        res.put("gl", gl);
        res.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        res.put("epsilonCuadrado", Math.round(epsilon2 * 100.0) / 100.0);
        res.put("significativo", pValor < 0.05);
        return res;
    }

    private double calcularEstadisticoH(double[] rangos, int[] grupos, int numGrupos, double factorEmpates) {
        double[] sumaR = new double[numGrupos];
        int[] ni = new int[numGrupos];
        int n = rangos.length;

        for (int i = 0; i < n; i++) {
            int g = grupos[i];
            sumaR[g] += rangos[i];
            ni[g]++;
        }

        double sumaR2SobreN = 0.0;
        for (int g = 0; g < numGrupos; g++) {
            if (ni[g] > 0) {
                sumaR2SobreN += (sumaR[g] * sumaR[g]) / ni[g];
            }
        }

        double hRaw = (12.0 / (n * (n + 1.0))) * sumaR2SobreN - 3.0 * (n + 1.0);
        return factorEmpates > 0 ? hRaw / factorEmpates : hRaw;
    }

    private String normalizarClaveSinAcentos(String s) {
        String nfd = Normalizer.normalize(s.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").replaceAll("\\s+", " ");
    }

    private String construirWhere(TituladosFiltroDTO f, List<Object> params) {
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