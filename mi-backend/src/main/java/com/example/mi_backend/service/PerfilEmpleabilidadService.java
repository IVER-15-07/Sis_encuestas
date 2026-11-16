package com.example.mi_backend.service;

import com.example.mi_backend.dto.TituladosFiltroDTO;
import org.apache.commons.math3.distribution.ChiSquaredDistribution;
import org.apache.commons.math3.stat.ranking.NaNStrategy;
import org.apache.commons.math3.stat.ranking.NaturalRanking;
import org.apache.commons.math3.stat.ranking.TiesStrategy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PerfilEmpleabilidadService {

    private final JdbcTemplate jdbcTemplate;

    // Orden salarial exacto de menor a mayor para Kruskal-Wallis y matriz
    private static final List<String> ORDEN_SALARIAL = List.of(
        "Menor a Bs. 2500",
        "Entre Bs. 2.500 - Bs. 3.500",
        "Entre Bs. 3.501 - Bs. 5.000",
        "Entre Bs. 5.001 - Bs. 7.000",
        "Entre Bs. 7.001 - Bs. 10.000",
        "Más de Bs. 10.000"
    );

    public PerfilEmpleabilidadService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> obtenerTodoPerfilEmpleabilidad(TituladosFiltroDTO f) {
        List<Object> params = new ArrayList<>();
        String where = construirWhereFiltrado(f, params);

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
        res.put("tabPerfil", calcularTabPerfil(where, params, f.getUmbralAnios()));
        res.put("tabTrabajoActual", calcularTabTrabajoActual(where, params));
        res.put("tabSinEmpleo", calcularTabSinEmpleo(where, params));
        res.put("tabPrimerEmpleo", calcularTabPrimerEmpleo(where, params));
        res.put("tabEmprendimiento", calcularTabEmprendimiento(where, params));
        return res;
    }

    // ------------------------------------------------------------------------
    // PESTAÑA 1: PERFIL
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularTabPerfil(String where, List<Object> baseParams, double umbral) {
        List<Object> p = new ArrayList<>();
        p.add(umbral);
        p.add(umbral);
        p.addAll(baseParams);

        String sql = """
            SELECT
                COUNT(sl.anios_vida_profesional) AS n_exp,
                ROUND(AVG(sl.anios_vida_profesional)::numeric, 1) AS media_exp,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sl.anios_vida_profesional)::numeric, 1) AS mediana_exp,
                ROUND(STDDEV_SAMP(sl.anios_vida_profesional)::numeric, 1) AS de_exp,
                COUNT(*) FILTER (WHERE sl.anios_vida_profesional <= ?) AS junior_count,
                COUNT(*) FILTER (WHERE sl.anios_vida_profesional > ?) AS consolidado_count,
                COUNT(sl.anios_desempleado) AS n_desemp,
                ROUND(AVG(sl.anios_desempleado)::numeric, 1) AS media_desemp,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sl.anios_desempleado)::numeric, 1) AS mediana_desemp,
                ROUND(STDDEV_SAMP(sl.anios_desempleado)::numeric, 1) AS de_desemp
            FROM public.respuesta r
            JOIN public.titulado t ON t.id = r.id
            LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE r.tipo = 'titulado'
        """ + where;

        Map<String, Object> tray = jdbcTemplate.queryForMap(sql, p.toArray());
        long nExp = ((Number) tray.get("n_exp")).longValue();
        long junior = ((Number) tray.get("junior_count")).longValue();
        long consol = ((Number) tray.get("consolidado_count")).longValue();
        tray.put("umbralAnios", umbral);
        tray.put("juniorPct", nExp > 0 ? Math.round((junior * 1000.0) / nExp) / 10.0 : 0.0);
        tray.put("consolidadoPct", nExp > 0 ? Math.round((consol * 1000.0) / nExp) / 10.0 : 0.0);

        List<Map<String, Object>> serieExp = jdbcTemplate.queryForList(
            "SELECT r.id, sl.anios_vida_profesional AS aniosExperiencia, " +
            "GREATEST(0, COALESCE(sl.anios_vida_profesional, 0) - COALESCE(sl.anios_desempleado, 0)) AS aniosActivos, " +
            "ea.antiguedad, sl.situacion " +
            "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' AND sl.anios_vida_profesional IS NOT NULL " + where +
            " ORDER BY sl.anios_vida_profesional ASC",
            baseParams.toArray()
        );

        Map<String, Object> tab = new LinkedHashMap<>();
        tab.put("trayectoria", tray);
        tab.put("serieExperiencia", serieExp);
        tab.put("estadoLaboral", agruparCampo("sl.situacion", where, baseParams));
        tab.put("sectorInsercion", agruparCampo("ea.sector", where, baseParams));
        tab.put("distribucionEdad", agruparCampo("t.edad_rango", where, baseParams));
        tab.put("distribucionGenero", agruparCampo("t.genero", where, baseParams));
        return tab;
    }

    // ------------------------------------------------------------------------
    // PESTAÑA 2: TRABAJO ACTUAL
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularTabTrabajoActual(String where, List<Object> params) {
        String sqlMatriz = """
            SELECT ea.rubro, ea.remuneracion, COUNT(*) AS total
            FROM public.respuesta r
            JOIN public.titulado t ON t.id = r.id
            LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE r.tipo = 'titulado' AND ea.rubro IS NOT NULL AND ea.remuneracion IS NOT NULL
        """ + where + " GROUP BY ea.rubro, ea.remuneracion ORDER BY ea.rubro";

        List<Map<String, Object>> filasRaw = jdbcTemplate.queryForList(sqlMatriz, params.toArray());

        Set<String> rubrosSet = new TreeSet<>();
        Map<String, Map<String, Long>> conteos = new HashMap<>();
        for (Map<String, Object> row : filasRaw) {
            String rub = String.valueOf(row.get("rubro"));
            String rem = String.valueOf(row.get("remuneracion"));
            long cnt = ((Number) row.get("total")).longValue();
            rubrosSet.add(rub);
            conteos.computeIfAbsent(rub, k -> new HashMap<>()).put(rem, cnt);
        }

        List<String> rubros = new ArrayList<>(rubrosSet);
        List<Map<String, Object>> filasMatriz = new ArrayList<>();
        long nTotalValidas = 0;

        for (String rub : rubros) {
            Map<String, Long> mapaRem = conteos.getOrDefault(rub, Map.of());
            long totalFila = mapaRem.values().stream().mapToLong(Long::longValue).sum();
            nTotalValidas += totalFila;

            List<Map<String, Object>> celdas = new ArrayList<>();
            for (String tramo : ORDEN_SALARIAL) {
                long c = mapaRem.getOrDefault(tramo, 0L);
                double pctFila = totalFila > 0 ? Math.round((c * 1000.0) / totalFila) / 10.0 : 0.0;
                celdas.add(Map.of("tramo", tramo, "frecuencia", c, "porcentajeFila", pctFila));
            }
            filasMatriz.add(Map.of("rubro", rub, "nFila", totalFila, "celdas", celdas));
        }

        Map<String, Object> kruskal = calcularKruskalWallis(conteos, rubros);

        long nOcupadosOrg = jdbcTemplate.queryForObject(
            "SELECT COUNT(DISTINCT ea.titulado_id) FROM public.respuesta r " +
            "JOIN public.titulado t ON t.id = r.id " +
            "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
            "JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
            "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
            "WHERE r.tipo = 'titulado' " + where,
            Long.class, params.toArray()
        );

        String sqlAreas = """
            SELECT COALESCE(o.valor, rm.otro_texto) AS area, COUNT(DISTINCT rm.respuesta_id) AS frecuencia
            FROM public.respuesta_multiple rm
            JOIN public.respuesta r ON r.id = rm.respuesta_id
            JOIN public.titulado t ON t.id = r.id
            LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            LEFT JOIN public.opcion o ON o.id = rm.opcion_id
            WHERE rm.pregunta_codigo = 'TIT_MULT_AREA_ORG'
        """ + where + " GROUP BY COALESCE(o.valor, rm.otro_texto) ORDER BY frecuencia DESC";

        List<Map<String, Object>> areas = jdbcTemplate.queryForList(sqlAreas, params.toArray());
        for (Map<String, Object> a : areas) {
            long f = ((Number) a.get("frecuencia")).longValue();
            a.put("porcentaje", nOcupadosOrg > 0 ? Math.round((f * 1000.0) / nOcupadosOrg) / 10.0 : 0.0);
        }

        List<Map<String, Object>> pertinencia = agruparLikert("TIT_LIKERT_PERTINENCIA_PUESTO", where, params);

        Map<String, Object> tab = new LinkedHashMap<>();
        tab.put("n", nOcupadosOrg);
        tab.put("matrizRemuneracionRubro", Map.of(
            "columnas", ORDEN_SALARIAL,
            "filas", filasMatriz,
            "nValidas", nTotalValidas,
            "kruskalWallis", kruskal
        ));
        tab.put("areasOrganizacion", areas);
        tab.put("pertinenciaCargo", pertinencia);
        return tab;
    }

    // ------------------------------------------------------------------------
    // PESTAÑA 3: SIN EMPLEO
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularTabSinEmpleo(String where, List<Object> params) {
        String baseSinEmpleo = """
            FROM public.respuesta r
            JOIN public.titulado t ON t.id = r.id
            JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE r.tipo = 'titulado' AND sl.situacion ILIKE '%NO trabajo%'
        """ + where;

        Map<String, Object> resumen = jdbcTemplate.queryForMap(
            "SELECT COUNT(*) AS n, " +
            "COUNT(*) FILTER (WHERE sl.tuvo_trabajo_antes = true) AS con_exp_previa, " +
            "ROUND(AVG(sl.anios_desempleado)::numeric, 1) AS media_busqueda, " +
            "ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sl.anios_desempleado)::numeric, 1) AS mediana_busqueda, " +
            "ROUND(STDDEV_SAMP(sl.anios_desempleado)::numeric, 1) AS de_busqueda " +
            baseSinEmpleo,
            params.toArray()
        );

        long n = ((Number) resumen.get("n")).longValue();
        long expPrevia = ((Number) resumen.get("con_exp_previa")).longValue();
        resumen.put("conExpPreviaPct", n > 0 ? Math.round((expPrevia * 1000.0) / n) / 10.0 : 0.0);

        List<Map<String, Object>> razones = jdbcTemplate.queryForList(
            "SELECT sl.razon_no_trabaja AS categoria, COUNT(*) AS frecuencia " +
            baseSinEmpleo + " AND sl.razon_no_trabaja IS NOT NULL GROUP BY sl.razon_no_trabaja ORDER BY frecuencia DESC",
            params.toArray()
        );
        for (Map<String, Object> r : razones) {
            long f = ((Number) r.get("frecuencia")).longValue();
            r.put("porcentaje", n > 0 ? Math.round((f * 1000.0) / n) / 10.0 : 0.0);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("resumen", resumen);
        out.put("razonesNoTrabaja", razones);
        return out;
    }

    // ------------------------------------------------------------------------
    // PESTAÑA 4: PRIMER EMPLEO
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularTabPrimerEmpleo(String where, List<Object> params) {
        String baseJoin = """
            FROM public.respuesta r
            JOIN public.titulado t ON t.id = r.id
            JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE r.tipo = 'titulado'
        """ + where;

        Map<String, Object> continuidad = jdbcTemplate.queryForMap(
            "SELECT COUNT(sl.primer_empleo) AS n_respondieron, " +
            "COUNT(*) FILTER (WHERE sl.primer_empleo = true) AS sigue_primer_empleo " + baseJoin,
            params.toArray()
        );
        long nResp = ((Number) continuidad.get("n_respondieron")).longValue();
        long sigue = ((Number) continuidad.get("sigue_primer_empleo")).longValue();
        continuidad.put("porcentaje", nResp > 0 ? Math.round((sigue * 1000.0) / nResp) / 10.0 : 0.0);

        List<Map<String, Object>> tiempos = jdbcTemplate.queryForList(
            "SELECT sl.tiempo_primer_trabajo AS categoria, COUNT(*) AS frecuencia " +
            baseJoin + " AND sl.tiempo_primer_trabajo IS NOT NULL GROUP BY sl.tiempo_primer_trabajo",
            params.toArray()
        );
        long nTiempos = tiempos.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        for (Map<String, Object> t : tiempos) {
            long f = ((Number) t.get("frecuencia")).longValue();
            t.put("porcentaje", nTiempos > 0 ? Math.round((f * 1000.0) / nTiempos) / 10.0 : 0.0);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("n", nTiempos);
        out.put("continuidadPrimerEmpleo", continuidad);
        out.put("tiempoHastaPrimerEmpleo", tiempos);
        out.put("cantidadEmpleos", agruparCampo("sl.num_empleos", where, params));
        return out;
    }

    // ------------------------------------------------------------------------
    // PESTAÑA 5: EMPRENDIMIENTO
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularTabEmprendimiento(String where, List<Object> params) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("origen", agruparCampo("emp.origen", where, params, true));
        out.put("entregable", agruparCampo("emp.entregable", where, params, true));
        out.put("financiamiento", agruparCampo("emp.financiamiento_externo", where, params, true));
        out.put("satisfaccionNegocio", agruparLikert("TIT_LIKERT_SATISFACCION_NEGOCIO", where, params));
        out.put("importanciaFormacion", agruparLikert("TIT_LIKERT_IMPORTANCIA_FORMACION_NEG", where, params));
        return out;
    }

    // ------------------------------------------------------------------------
    // KRUSKAL-WALLIS Y ÉPSILON CUADRADO
    // ------------------------------------------------------------------------
    private Map<String, Object> calcularKruskalWallis(Map<String, Map<String, Long>> conteos, List<String> grupos) {
        List<Double> todosLosValores = new ArrayList<>();
        List<Integer> tamanosGrupo = new ArrayList<>();

        for (String g : grupos) {
            Map<String, Long> mapa = conteos.getOrDefault(g, Map.of());
            int nGrupo = 0;
            for (int idx = 0; idx < ORDEN_SALARIAL.size(); idx++) {
                long freq = mapa.getOrDefault(ORDEN_SALARIAL.get(idx), 0L);
                for (long k = 0; k < freq; k++) {
                    todosLosValores.add((double) (idx + 1));
                    nGrupo++;
                }
            }
            if (nGrupo > 0) tamanosGrupo.add(nGrupo);
        }

        int n = todosLosValores.size();
        int k = tamanosGrupo.size();
        if (n < 5 || k < 2) {
            return Map.of("h", 0.0, "gl", 0, "pValor", 1.0, "epsilonCuadrado", 0.0, "significativo", false);
        }

        double[] arr = todosLosValores.stream().mapToDouble(Double::doubleValue).toArray();
        NaturalRanking ranking = new NaturalRanking(NaNStrategy.REMOVED, TiesStrategy.AVERAGE);
        double[] rangos = ranking.rank(arr);

        double sumaR2SobreN = 0.0;
        int cursor = 0;
        for (int ni : tamanosGrupo) {
            double ri = 0.0;
            for (int j = 0; j < ni; j++) {
                ri += rangos[cursor++];
            }
            sumaR2SobreN += (ri * ri) / ni;
        }

        double hSinCorregir = (12.0 / (n * (n + 1.0))) * sumaR2SobreN - 3.0 * (n + 1.0);

        Map<Double, Long> freqValores = new HashMap<>();
        for (double v : arr) freqValores.merge(v, 1L, Long::sum);
        double sumTies = 0.0;
        for (long t : freqValores.values()) {
            if (t > 1) sumTies += (Math.pow(t, 3) - t);
        }
        double factorEmpates = 1.0 - (sumTies / (Math.pow(n, 3) - n));
        double h = factorEmpates > 0 ? hSinCorregir / factorEmpates : hSinCorregir;

        int gl = k - 1;
        ChiSquaredDistribution chiDist = new ChiSquaredDistribution(gl);
        double pValor = 1.0 - chiDist.cumulativeProbability(Math.max(0.0, h));
        double epsilon2 = h / (n - 1.0);

        return Map.of(
            "h", Math.round(h * 100.0) / 100.0,
            "gl", gl,
            "pValor", Math.round(pValor * 1000.0) / 1000.0,
            "epsilonCuadrado", Math.round(epsilon2 * 100.0) / 100.0,
            "significativo", pValor < 0.05
        );
    }

    // ------------------------------------------------------------------------
    // HELPERS SQL DINÁMICOS
    // ------------------------------------------------------------------------
    private String construirWhereFiltrado(TituladosFiltroDTO f, List<Object> params) {
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

    private Map<String, Object> agruparCampo(String columnaSql, String where, List<Object> params) {
        return agruparCampo(columnaSql, where, params, false);
    }

    private Map<String, Object> agruparCampo(String columnaSql, String where, List<Object> params, boolean joinEmprendimiento) {
        String joinEmp = joinEmprendimiento ? " JOIN public.emprendimiento emp ON emp.titulado_id = r.id " : "";
        String sql = "SELECT " + columnaSql + " AS categoria, COUNT(*) AS frecuencia " +
                     "FROM public.respuesta r JOIN public.titulado t ON t.id = r.id " +
                     "LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id " +
                     "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id " +
                     "LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id " +
                     joinEmp +
                     "WHERE r.tipo = 'titulado' AND " + columnaSql + " IS NOT NULL " + where +
                     " GROUP BY " + columnaSql + " ORDER BY frecuencia DESC";

        List<Map<String, Object>> items = jdbcTemplate.queryForList(sql, params.toArray());
        long total = items.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        for (Map<String, Object> it : items) {
            long f = ((Number) it.get("frecuencia")).longValue();
            it.put("porcentaje", total > 0 ? Math.round((f * 1000.0) / total) / 10.0 : 0.0);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("n", total);
        out.put("items", items);
        return out;
    }

    private List<Map<String, Object>> agruparLikert(String preguntaCodigo, String where, List<Object> baseParams) {
        List<Object> p = new ArrayList<>();
        p.add(preguntaCodigo);
        p.addAll(baseParams);

        String sql = """
            SELECT o.valor AS categoria, o.orden, o.puntaje, COUNT(*) AS frecuencia
            FROM public.respuesta_likert rl
            JOIN public.opcion o ON o.id = rl.opcion_id
            JOIN public.respuesta r ON r.id = rl.respuesta_id
            JOIN public.titulado t ON t.id = r.id
            LEFT JOIN public.situacion_laboral sl ON sl.titulado_id = r.id
            LEFT JOIN public.empleo_actual ea ON ea.titulado_id = r.id
            LEFT JOIN public.formacion_posgrado fp ON fp.titulado_id = r.id
            WHERE rl.pregunta_codigo = ?
        """ + where + " GROUP BY o.valor, o.orden, o.puntaje ORDER BY o.orden ASC";

        List<Map<String, Object>> items = jdbcTemplate.queryForList(sql, p.toArray());
        long total = items.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        for (Map<String, Object> it : items) {
            long f = ((Number) it.get("frecuencia")).longValue();
            it.put("porcentaje", total > 0 ? Math.round((f * 1000.0) / total) / 10.0 : 0.0);
        }
        return items;
    }
}