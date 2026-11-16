package com.example.mi_backend.service;

import com.example.mi_backend.dto.TituladosFiltroDTO;
import org.apache.commons.math3.distribution.ChiSquaredDistribution;
import org.apache.commons.math3.stat.ranking.NaNStrategy;
import org.apache.commons.math3.stat.ranking.NaturalRanking;
import org.apache.commons.math3.stat.ranking.TiesStrategy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class FormacionYFinanciamientoService {

    private final JdbcTemplate jdbcTemplate;

    private static final List<String> NIVELES_POSGRADO = List.of(
        "DIPLOMADO", "ESPECIALIDAD", "MAESTRIA", "DOCTORADO", "POSDOCTORADO"
    );

    private static final Map<String, String> ETIQUETAS_NIVEL = Map.of(
        "DIPLOMADO", "Diplomado",
        "ESPECIALIDAD", "Especialidad",
        "MAESTRIA", "Maestría",
        "DOCTORADO", "Doctorado",
        "POSDOCTORADO", "Posdoctorado"
    );

    private static final List<String> ORDEN_FINANCIAMIENTO = List.of(
        "FINANCIADO CON RECURSOS PROPIOS",
        "FINANCIADO PARCIALMENTE POR MEDIO DE UNA BECA",
        "TOTAL FINANCIAMIENTO POR MEDIO DE UNA BECA"
    );

    private static final Map<String, String> ETIQUETAS_FINANC = Map.of(
        "FINANCIADO CON RECURSOS PROPIOS", "Recursos propios",
        "FINANCIADO PARCIALMENTE POR MEDIO DE UNA BECA", "Beca parcial",
        "TOTAL FINANCIAMIENTO POR MEDIO DE UNA BECA", "Beca total"
    );

    public FormacionYFinanciamientoService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ========================================================================
    // VISTA 1: FORMACIÓN CONTINUA
    // ========================================================================
    public Map<String, Object> obtenerFormacionContinua(TituladosFiltroDTO f) {
        List<Object> params = new ArrayList<>();
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

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalUniverso", totalUniverso);
        res.put("totalFiltrado", totalFiltrado);
        res.put("tabPosgradoCursado", calcularTabPosgradoCursado(where, params));
        res.put("tabInteresPosgrado", calcularTabInteresPosgrado(where, params));
        res.put("tabOpinionPosgrado", calcularTabOpinionPosgrado(where, params));
        return res;
    }

    private Map<String, Object> calcularTabPosgradoCursado(String where, List<Object> params) {
        Map<String, Object> resumen = jdbcTemplate.queryForMap(
            "SELECT COUNT(*) AS n_total, " +
            "COUNT(*) FILTER (WHERE fp.tiene_formacion = true) AS si_count, " +
            "COUNT(*) FILTER (WHERE fp.tiene_formacion = false) AS no_count " +
            "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' " + where,
            params.toArray()
        );
        long nTotal = ((Number) resumen.get("n_total")).longValue();
        long siCount = ((Number) resumen.get("si_count")).longValue();
        resumen.put("porcentajeSi", nTotal > 0 ? Math.round((siCount * 1000.0) / nTotal) / 10.0 : 0.0);

        List<Map<String, Object>> nivelesRaw = jdbcTemplate.queryForList(
            "SELECT UPPER(TRIM(fp.nivel)) AS nivel, COUNT(*) AS frecuencia " +
            "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' AND fp.nivel IS NOT NULL " + where +
            " GROUP BY UPPER(TRIM(fp.nivel))",
            params.toArray()
        );
        Map<String, Long> mapaNiveles = new HashMap<>();
        for (Map<String, Object> m : nivelesRaw) {
            mapaNiveles.put(String.valueOf(m.get("nivel")), ((Number) m.get("frecuencia")).longValue());
        }
        long nCursados = mapaNiveles.values().stream().mapToLong(Long::longValue).sum();

        List<Map<String, Object>> nivelesOrdenados = new ArrayList<>();
        for (String cod : NIVELES_POSGRADO) {
            long freq = mapaNiveles.getOrDefault(cod, 0L);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("codigo", cod);
            item.put("categoria", ETIQUETAS_NIVEL.getOrDefault(cod, cod));
            item.put("frecuencia", freq);
            item.put("porcentaje", nCursados > 0 ? Math.round((freq * 1000.0) / nCursados) / 10.0 : 0.0);
            nivelesOrdenados.add(item);
        }

        List<Map<String, Object>> instituciones = agruparPosgrado("fp.lugar", where, params);

        List<Map<String, Object>> financ = agruparFinanciamiento(where, params);
        long conBeca = financ.stream()
            .filter(m -> !String.valueOf(m.get("codigo")).equals("FINANCIADO CON RECURSOS PROPIOS"))
            .mapToLong(m -> ((Number) m.get("frecuencia")).longValue())
            .sum();

        Map<String, Object> nivel = new LinkedHashMap<>();
        nivel.put("n", nCursados);
        nivel.put("items", nivelesOrdenados);

        Map<String, Object> inst = new LinkedHashMap<>();
        inst.put("n", nCursados);
        inst.put("items", instituciones);

        Map<String, Object> fin = new LinkedHashMap<>();
        fin.put("n", nCursados);
        fin.put("conBeca", conBeca);
        fin.put("items", financ);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("formacionActiva", resumen);
        out.put("nivelMasAlto", nivel);
        out.put("institucion", inst);
        out.put("financiamiento", fin);
        return out;
    }

    private Map<String, Object> calcularTabInteresPosgrado(String where, List<Object> params) {
        Map<String, Object> interes = jdbcTemplate.queryForMap(
            "SELECT COUNT(*) AS n_total, " +
            "COUNT(*) FILTER (WHERE fp.interesado = true) AS si_count, " +
            "COUNT(*) FILTER (WHERE fp.interesado = false) AS no_count " +
            "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' " + where,
            params.toArray()
        );
        long nTotal = ((Number) interes.get("n_total")).longValue();
        long siCount = ((Number) interes.get("si_count")).longValue();
        interes.put("porcentajeSi", nTotal > 0 ? Math.round((siCount * 1000.0) / nTotal) / 10.0 : 0.0);

        List<Map<String, Object>> areas = agruparPosgrado("fp.area_interes", where, params);
        List<Map<String, Object>> orgPreferida = agruparPosgrado("fp.organizacion_preferida", where, params);

        Map<String, Object> areasMap = new LinkedHashMap<>();
        areasMap.put("n", siCount);
        areasMap.put("items", areas);

        Map<String, Object> orgMap = new LinkedHashMap<>();
        orgMap.put("n", siCount);
        orgMap.put("items", orgPreferida);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("interesPosgrado", interes);
        out.put("areasInteres", areasMap);
        out.put("organizacionPreferida", orgMap);
        return out;
    }

    private Map<String, Object> calcularTabOpinionPosgrado(String where, List<Object> baseParams) {
        List<Object> p = new ArrayList<>();
        p.add("TIT_LIKERT_POSGRADO_AFIN");
        p.addAll(baseParams);

        String sql = """
            SELECT o.valor AS categoria, o.orden, o.puntaje, COUNT(rl.respuesta_id) AS frecuencia
            FROM public.opcion o
            LEFT JOIN public.respuesta_likert rl ON rl.opcion_id = o.id
            LEFT JOIN public.respuesta r ON r.id = rl.respuesta_id
            LEFT JOIN public.titulado t ON t.id = r.id
            LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE o.pregunta_codigo = ?
        """ + (where.isEmpty() ? "" : " AND (r.id IS NULL OR (1=1 " + where + "))") +
        " GROUP BY o.valor, o.orden, o.puntaje ORDER BY o.orden ASC";

        List<Map<String, Object>> items = jdbcTemplate.queryForList(sql, p.toArray());
        long n = items.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        long desacuerdo = 0, acuerdo = 0;

        for (Map<String, Object> it : items) {
            long f = ((Number) it.get("frecuencia")).longValue();
            int orden = ((Number) it.get("orden")).intValue();
            it.put("porcentaje", n > 0 ? Math.round((f * 1000.0) / n) / 10.0 : 0.0);
            if (orden <= 2) desacuerdo += f;
            else acuerdo += f;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("n", n);
        out.put("desacuerdoCount", desacuerdo);
        out.put("desacuerdoPct", n > 0 ? Math.round((desacuerdo * 1000.0) / n) / 10.0 : 0.0);
        out.put("acuerdoCount", acuerdo);
        out.put("acuerdoPct", n > 0 ? Math.round((acuerdo * 1000.0) / n) / 10.0 : 0.0);
        out.put("items", items);
        return out;
    }

    // ========================================================================
    // VISTA 2: FINANCIAMIENTO
    // ========================================================================
    public Map<String, Object> obtenerAnalisisFinanciamiento(String columnaCruce, TituladosFiltroDTO f) {
        List<Object> params = new ArrayList<>();
        String where = construirWhere(f, params);

        List<Map<String, Object>> distribucion = agruparFinanciamiento(where, params);
        long n = distribucion.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();

        String exprColumna;
        String tituloColumna;
        boolean columnaEsOrdinal;
        List<String> ordenCols;

        switch (columnaCruce == null ? "nivel" : columnaCruce.toLowerCase(Locale.ROOT)) {
            case "lugar", "institucion" -> {
                exprColumna = "fp.lugar";
                tituloColumna = "Institución donde cursó";
                columnaEsOrdinal = false;
                ordenCols = List.of();
            }
            case "sector" -> {
                exprColumna = "ea.sector";
                tituloColumna = "Sector laboral actual";
                columnaEsOrdinal = false;
                ordenCols = List.of("PRIVADO", "PÚBLICO");
            }
            case "remuneracion" -> {
                exprColumna = "ea.remuneracion";
                tituloColumna = "Remuneración mensual actual";
                columnaEsOrdinal = true;
                ordenCols = List.of(
                    "Menor a Bs. 2500", "Entre Bs. 2.500 - Bs. 3.500", "Entre Bs. 3.501 - Bs. 5.000",
                    "Entre Bs. 5.001 - Bs. 7.000", "Entre Bs. 7.001 - Bs. 10.000", "Más de Bs. 10.000"
                );
            }
            default -> {
                exprColumna = "UPPER(TRIM(fp.nivel))";
                tituloColumna = "Nivel de formación cursada";
                columnaEsOrdinal = true;
                ordenCols = List.of("DIPLOMADO", "ESPECIALIDAD", "MAESTRIA", "DOCTORADO");
            }
        }

        String sqlCruce = "SELECT fp.financiamiento AS fila, " + exprColumna + " AS col, COUNT(*) AS total " +
                          "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
                          "JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                          "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                          "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                          "WHERE r.tipo = 'titulado' AND fp.financiamiento IS NOT NULL AND " + exprColumna + " IS NOT NULL " +
                          where + " GROUP BY fp.financiamiento, " + exprColumna;

        List<Map<String, Object>> raw = jdbcTemplate.queryForList(sqlCruce, params.toArray());

        Set<String> setCols = new LinkedHashSet<>(ordenCols);
        Map<String, Map<String, Long>> matriz = new HashMap<>();
        for (Map<String, Object> r : raw) {
            String fil = String.valueOf(r.get("fila"));
            String col = String.valueOf(r.get("col"));
            long cnt = ((Number) r.get("total")).longValue();
            setCols.add(col);
            matriz.computeIfAbsent(fil, k -> new HashMap<>()).put(col, cnt);
        }

        List<String> colsActivas = setCols.stream()
            .filter(c -> raw.stream().anyMatch(r -> c.equals(String.valueOf(r.get("col")))))
            .toList();

        List<String> colsEtiquetas = colsActivas.stream()
            .map(c -> ETIQUETAS_NIVEL.getOrDefault(c, c))
            .toList();

        int rCount = ORDEN_FINANCIAMIENTO.size();
        int cCount = colsActivas.size();
        long[][] observados = new long[rCount][cCount];
        long[] totalFila = new long[rCount];
        long[] totalCol = new long[cCount];
        long granTotal = 0;
        int celdasMenor5 = 0;

        for (int i = 0; i < rCount; i++) {
            String filCod = ORDEN_FINANCIAMIENTO.get(i);
            for (int j = 0; j < cCount; j++) {
                long v = matriz.getOrDefault(filCod, Map.of()).getOrDefault(colsActivas.get(j), 0L);
                observados[i][j] = v;
                totalFila[i] += v;
                totalCol[j] += v;
                granTotal += v;
                if (v < 5) celdasMenor5++;
            }
        }

        Map<String, Object> pruebaEstadistica = calcularKruskalWallisConMonteCarlo(observados, 10000);

        List<String> filasEtiquetas = ORDEN_FINANCIAMIENTO.stream()
            .map(c -> ETIQUETAS_FINANC.getOrDefault(c, c))
            .toList();

        Map<String, Object> distMap = new LinkedHashMap<>();
        distMap.put("n", n);
        distMap.put("items", distribucion);

        // Map.of soporta máx. 10 pares; aquí hay 12, por eso LinkedHashMap
        Map<String, Object> cruce = new LinkedHashMap<>();
        cruce.put("tituloFila", "Financiamiento de la formación cursada");
        cruce.put("tituloColumna", tituloColumna);
        cruce.put("columnaEsOrdinal", columnaEsOrdinal);
        cruce.put("filas", filasEtiquetas);
        cruce.put("columnas", colsEtiquetas);
        cruce.put("observados", observados);
        cruce.put("totalesFila", totalFila);
        cruce.put("totalesColumna", totalCol);
        cruce.put("totalN", granTotal);
        cruce.put("celdasMenoresA5", celdasMenor5);
        cruce.put("totalCeldas", rCount * cCount);
        cruce.put("pruebaEstadistica", pruebaEstadistica);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("distribucionFinanciamiento", distMap);
        res.put("cruce", cruce);
        return res;
    }

    // ------------------------------------------------------------------------
    // KRUSKAL-WALLIS + MONTE CARLO
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularKruskalWallisConMonteCarlo(long[][] observados, int iteraciones) {
        int rCount = observados.length;
        int cCount = rCount > 0 ? observados[0].length : 0;

        List<Integer> grupos = new ArrayList<>();
        List<Double> valores = new ArrayList<>();

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
            Map<String, Object> vacio = new LinkedHashMap<>();
            vacio.put("h", 0.0);
            vacio.put("gl", 0);
            vacio.put("pValor", 1.0);
            vacio.put("epsilonCuadrado", 0.0);
            vacio.put("significativo", false);
            vacio.put("metodo", "Insuficiente");
            return vacio;
        }

        double[] arrVals = valores.stream().mapToDouble(Double::doubleValue).toArray();
        int[] arrGrupos = grupos.stream().mapToInt(Integer::intValue).toArray();

        NaturalRanking ranking = new NaturalRanking(NaNStrategy.REMOVED, TiesStrategy.AVERAGE);
        double[] rangos = ranking.rank(arrVals);

        Map<Double, Long> freqTies = new HashMap<>();
        for (double v : arrVals) freqTies.merge(v, 1L, Long::sum);
        double sumTies = 0.0;
        for (long t : freqTies.values()) {
            if (t > 1) sumTies += (Math.pow(t, 3) - t);
        }
        double factorEmpates = 1.0 - (sumTies / (Math.pow(n, 3) - n));

        double hObservado = calcularEstadisticoH(rangos, arrGrupos, rCount, factorEmpates);
        int gl = (int) Arrays.stream(arrGrupos).distinct().count() - 1;
        double epsilon2 = hObservado / (n - 1.0);

        int[] conteoGrupo = new int[rCount];
        for (int g : arrGrupos) conteoGrupo[g]++;
        boolean usarMonteCarlo = Arrays.stream(conteoGrupo).filter(c -> c > 0).anyMatch(c -> c < 5);

        double pValor;
        String metodo;
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
                if (hPerm >= hObservado - 1e-9) mayoresOIguales++;
            }
            pValor = (double) mayoresOIguales / iteraciones;
            metodo = "Monte Carlo (" + iteraciones + " permutaciones)";
        } else {
            ChiSquaredDistribution chiDist = new ChiSquaredDistribution(Math.max(1, gl));
            pValor = 1.0 - chiDist.cumulativeProbability(Math.max(0.0, hObservado));
            metodo = "Aproximación Chi-cuadrado";
        }

        String magnitudEfecto = epsilon2 < 0.06 ? "Pequeña" : (epsilon2 < 0.14 ? "Moderada" : "Grande");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("h", Math.round(hObservado * 100.0) / 100.0);
        out.put("gl", gl);
        out.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        out.put("epsilonCuadrado", Math.round(epsilon2 * 1000.0) / 1000.0);
        out.put("magnitudEfecto", magnitudEfecto);
        out.put("significativo", pValor < 0.05);
        out.put("metodo", metodo);
        return out;
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
            if (ni[g] > 0) sumaR2SobreN += (sumaR[g] * sumaR[g]) / ni[g];
        }

        double hRaw = (12.0 / (n * (n + 1.0))) * sumaR2SobreN - 3.0 * (n + 1.0);
        return factorEmpates > 0 ? hRaw / factorEmpates : hRaw;
    }

    // ------------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------------
    private List<Map<String, Object>> agruparPosgrado(String col, String where, List<Object> params) {
        String sql = "SELECT " + col + " AS categoria, COUNT(*) AS frecuencia " +
                     "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
                     "JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "WHERE r.tipo = 'titulado' AND " + col + " IS NOT NULL " + where +
                     " GROUP BY " + col + " ORDER BY frecuencia DESC";
        List<Map<String, Object>> list = jdbcTemplate.queryForList(sql, params.toArray());
        long total = list.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        for (Map<String, Object> m : list) {
            long f = ((Number) m.get("frecuencia")).longValue();
            m.put("porcentaje", total > 0 ? Math.round((f * 1000.0) / total) / 10.0 : 0.0);
        }
        return list;
    }

    private List<Map<String, Object>> agruparFinanciamiento(String where, List<Object> params) {
        String sql = "SELECT fp.financiamiento AS codigo, COUNT(*) AS frecuencia " +
                     "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
                     "JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "WHERE r.tipo = 'titulado' AND fp.financiamiento IS NOT NULL " + where +
                     " GROUP BY fp.financiamiento";
        List<Map<String, Object>> raw = jdbcTemplate.queryForList(sql, params.toArray());
        Map<String, Long> map = new HashMap<>();
        for (Map<String, Object> r : raw) {
            map.put(String.valueOf(r.get("codigo")), ((Number) r.get("frecuencia")).longValue());
        }
        long total = map.values().stream().mapToLong(Long::longValue).sum();

        List<Map<String, Object>> res = new ArrayList<>();
        for (String cod : ORDEN_FINANCIAMIENTO) {
            long f = map.getOrDefault(cod, 0L);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("codigo", cod);
            item.put("categoria", ETIQUETAS_FINANC.getOrDefault(cod, cod));
            item.put("frecuencia", f);
            item.put("porcentaje", total > 0 ? Math.round((f * 1000.0) / total) / 10.0 : 0.0);
            res.add(item);
        }
        return res;
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