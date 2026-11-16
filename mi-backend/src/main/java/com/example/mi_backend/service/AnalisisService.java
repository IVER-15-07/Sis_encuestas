package com.example.mi_backend.service;

import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AnalisisService {

    private final JdbcTemplate jdbcTemplate;

    public AnalisisService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // 1. Listar catálogo de variables disponibles para dropdowns en React
    public List<Map<String, Object>> listarPreguntas(String encuesta) {
        return jdbcTemplate.queryForList(
            "SELECT codigo, encuesta, dimension, etiqueta_corta, texto_forms, tipo FROM public.pregunta WHERE encuesta = ? ORDER BY dimension, codigo",
            encuesta
        );
    }

    // 2. Balance de frecuencias (soporta variables 'unica', 'likert' y 'multiple')
    public Map<String, Object> obtenerBalancePregunta(String preguntaCodigo, Long importacionId) {
        Map<String, Object> meta = jdbcTemplate.queryForMap(
            "SELECT codigo, encuesta, dimension, etiqueta_corta, texto_forms, tipo FROM public.pregunta WHERE codigo = ?",
            preguntaCodigo
        );

        String tipo = (String) meta.get("tipo");
        String encuesta = (String) meta.get("encuesta");
        List<Map<String, Object>> items;
        long totalEncuestados;

        if ("multiple".equals(tipo)) {
            String filtroImp = (importacionId != null && importacionId > 0) ? " AND r.importacion_id = " + importacionId : "";
            totalEncuestados = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT rm.respuesta_id) FROM public.respuesta_multiple rm JOIN public.respuesta r ON r.id = rm.respuesta_id WHERE rm.pregunta_codigo = ?" + filtroImp,
                Long.class, preguntaCodigo
            );
            String sql = """
                SELECT COALESCE(o.valor, 'Otro: ' || rm.otro_texto) AS categoria,
                       COALESCE(o.orden, 999) AS orden,
                       COUNT(*) AS frecuencia
                FROM public.respuesta_multiple rm
                JOIN public.respuesta r ON r.id = rm.respuesta_id
                LEFT JOIN public.opcion o ON o.id = rm.opcion_id
                WHERE rm.pregunta_codigo = ?
                """ + filtroImp + """
                GROUP BY COALESCE(o.valor, 'Otro: ' || rm.otro_texto), COALESCE(o.orden, 999)
                ORDER BY frecuencia DESC, orden ASC
            """;
            items = jdbcTemplate.queryForList(sql, preguntaCodigo);
        } else {
            String vista = "titulados".equals(encuesta) ? "public.vw_titulados_variables" : "public.vw_empleadores_variables";
            String filtroImp = (importacionId != null && importacionId > 0) ? " AND v.importacion_id = " + importacionId : "";
            String sql = "SELECT v.valor AS categoria, COALESCE(o.orden, 999) AS orden, o.puntaje, COUNT(*) AS frecuencia " +
                         "FROM " + vista + " v " +
                         "LEFT JOIN public.opcion o ON o.pregunta_codigo = v.pregunta_codigo AND o.valor = v.valor " +
                         "WHERE v.pregunta_codigo = ? " + filtroImp +
                         " GROUP BY v.valor, o.orden, o.puntaje ORDER BY orden ASC, frecuencia DESC";
            items = jdbcTemplate.queryForList(sql, preguntaCodigo);
            totalEncuestados = items.stream().mapToLong(m -> ((Number) m.get("frecuencia")).longValue()).sum();
        }

        double sumaPuntajes = 0;
        long nValidosPuntaje = 0;
        for (Map<String, Object> row : items) {
            long freq = ((Number) row.get("frecuencia")).longValue();
            double pct = totalEncuestados > 0 ? Math.round((freq * 1000.0) / totalEncuestados) / 10.0 : 0.0;
            row.put("porcentaje", pct);
            if (row.get("puntaje") != null) {
                sumaPuntajes += ((Number) row.get("puntaje")).doubleValue() * freq;
                nValidosPuntaje += freq;
            }
        }

        Map<String, Object> resp = new LinkedHashMap<>(meta);
        resp.put("n", totalEncuestados);
        resp.put("promedioLikert", nValidosPuntaje > 0 ? Math.round((sumaPuntajes / nValidosPuntaje) * 100.0) / 100.0 : null);
        resp.put("distribucion", items);
        return resp;
    }

    // 3. Perfil de empleabilidad completo
    public Map<String, Object> obtenerPerfilEmpleabilidad(double umbralAnios, Long importacionId) {
        String filtroImp = (importacionId != null && importacionId > 0) ? " AND r.importacion_id = " + importacionId : "";

        String sqlTrayectoria = """
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
            FROM public.situacion_laboral sl
            JOIN public.respuesta r ON r.id = sl.titulado_id
            WHERE 1=1
        """ + filtroImp;

        Map<String, Object> tray = jdbcTemplate.queryForMap(sqlTrayectoria, umbralAnios, umbralAnios);
        long nExp = ((Number) tray.get("n_exp")).longValue();
        long junior = ((Number) tray.get("junior_count")).longValue();
        long consol = ((Number) tray.get("consolidado_count")).longValue();
        tray.put("umbralAnios", umbralAnios);
        tray.put("juniorPct", nExp > 0 ? Math.round((junior * 1000.0) / nExp) / 10.0 : 0.0);
        tray.put("consolidadoPct", nExp > 0 ? Math.round((consol * 1000.0) / nExp) / 10.0 : 0.0);

        List<Map<String, Object>> serieExperiencia = jdbcTemplate.queryForList(
            "SELECT sl.titulado_id AS id, sl.anios_vida_profesional AS aniosExperiencia, sl.anios_desempleado AS aniosDesempleado, ea.antiguedad, sl.situacion " +
            "FROM public.situacion_laboral sl JOIN public.respuesta r ON r.id = sl.titulado_id " +
            "LEFT JOIN public.empleo_actual ea ON ea.titulado_id = sl.titulado_id " +
            "WHERE sl.anios_vida_profesional IS NOT NULL " + filtroImp + " ORDER BY sl.anios_vida_profesional ASC"
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trayectoria", tray);
        result.put("serieExperiencia", serieExperiencia);
        result.put("estadoLaboral", obtenerBalancePregunta("TIT_SITUACION_LABORAL", importacionId));
        result.put("sectorInsercion", obtenerBalancePregunta("TIT_EMPLEO_SECTOR", importacionId));
        result.put("distribucionEdad", obtenerBalancePregunta("TIT_EDAD", importacionId));
        result.put("distribucionGenero", obtenerBalancePregunta("TIT_GENERO", importacionId));
        result.put("remuneracion", obtenerBalancePregunta("TIT_EMPLEO_REMUNERACION", importacionId));
        result.put("tiempoPrimerEmpleo", obtenerBalancePregunta("TIT_TIEMPO_PRIMER_EMPLEO", importacionId));
        return result;
    }

    // 4. Tabla Cruzada + Chi-Cuadrado + V de Cramér
    public Map<String, Object> calcularCruceYChiCuadrado(String encuesta, String varFila, String varColumna, Long importacionId) {
        String vista = "empleadores".equalsIgnoreCase(encuesta) ? "public.vw_empleadores_variables" : "public.vw_titulados_variables";

        Integer validas = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.pregunta WHERE encuesta = ? AND codigo IN (?, ?)",
            Integer.class, encuesta.toLowerCase(Locale.ROOT), varFila, varColumna
        );
        if (validas == null || validas < 2) {
            throw new IllegalArgumentException("Las variables seleccionadas no pertenecen a la encuesta " + encuesta);
        }

        String filtroImp = (importacionId != null && importacionId > 0) ? " AND a.importacion_id = " + importacionId : "";
        String sql = "SELECT a.valor AS fila, b.valor AS columna, COUNT(*) AS total " +
                     "FROM " + vista + " a " +
                     "JOIN " + vista + " b ON a.respuesta_id = b.respuesta_id " +
                     "WHERE a.pregunta_codigo = ? AND b.pregunta_codigo = ? " + filtroImp +
                     " GROUP BY a.valor, b.valor";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, varFila, varColumna);
        if (rows.isEmpty()) {
            throw new IllegalStateException("No existen registros cruzados para las variables seleccionadas.");
        }

        List<String> ordenFila = obtenerOrdenCategorias(varFila);
        List<String> ordenCol = obtenerOrdenCategorias(varColumna);

        Set<String> setF = new LinkedHashSet<>(ordenFila);
        Set<String> setC = new LinkedHashSet<>(ordenCol);
        Map<String, Map<String, Long>> matrizMap = new HashMap<>();

        for (Map<String, Object> r : rows) {
            String f = String.valueOf(r.get("fila"));
            String c = String.valueOf(r.get("columna"));
            long cnt = ((Number) r.get("total")).longValue();
            setF.add(f);
            setC.add(c);
            matrizMap.computeIfAbsent(f, k -> new HashMap<>()).put(c, cnt);
        }

        List<String> catFila = setF.stream().filter(f -> matrizMap.containsKey(f)).toList();
        List<String> catCol = setC.stream().filter(c -> rows.stream().anyMatch(r -> c.equals(String.valueOf(r.get("columna"))))).toList();

        if (catFila.size() < 2 || catCol.size() < 2) {
            throw new IllegalStateException("Se requieren al menos 2 categorías con datos por eje para calcular Chi-cuadrado.");
        }

        int rCount = catFila.size();
        int cCount = catCol.size();
        long[][] observados = new long[rCount][cCount];
        long[] totalFila = new long[rCount];
        long[] totalCol = new long[cCount];
        long granTotal = 0;

        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                long v = matrizMap.getOrDefault(catFila.get(i), Map.of()).getOrDefault(catCol.get(j), 0L);
                observados[i][j] = v;
                totalFila[i] += v;
                totalCol[j] += v;
                granTotal += v;
            }
        }

        double[][] esperados = new double[rCount][cCount];
        int celdasMenoresA5 = 0;
        for (int i = 0; i < rCount; i++) {
            for (int j = 0; j < cCount; j++) {
                double exp = (double) (totalFila[i] * totalCol[j]) / granTotal;
                esperados[i][j] = Math.round(exp * 100.0) / 100.0;
                if (exp < 5.0) celdasMenoresA5++;
            }
        }

        ChiSquareTest chiTest = new ChiSquareTest();
        double chi2 = chiTest.chiSquare(observados);
        double pValor = chiTest.chiSquareTest(observados);
        int gl = (rCount - 1) * (cCount - 1);
        double vCramer = Math.sqrt(chi2 / (granTotal * Math.min(rCount - 1, cCount - 1)));
        double pctCeldasMenor5 = Math.round((celdasMenoresA5 * 1000.0) / (rCount * cCount)) / 10.0;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("encuesta", encuesta);
        res.put("variableFila", varFila);
        res.put("variableColumna", varColumna);
        res.put("categoriasFila", catFila);
        res.put("categoriasColumna", catCol);
        res.put("observados", observados);
        res.put("esperados", esperados);
        res.put("totalesFila", totalFila);
        res.put("totalesColumna", totalCol);
        res.put("totalN", granTotal);
        res.put("chiCuadrado", Math.round(chi2 * 10000.0) / 10000.0);
        res.put("gradosLibertad", gl);
        res.put("pValor", Math.round(pValor * 1000000.0) / 1000000.0);
        res.put("significativo", pValor < 0.05);
        res.put("vCramer", Math.round(vCramer * 1000.0) / 1000.0);
        res.put("advertenciaCochran", pctCeldasMenor5 > 20.0
            ? "Advertencia: " + pctCeldasMenor5 + "% de celdas tienen frecuencia esperada < 5."
            : null);
        return res;
    }

    // 5. Brechas de competencias y valoración Empleadores vs Titulados
    public Map<String, Object> obtenerBrechasYValoracion(Long importacionTitId, Long importacionEmpId) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("satisfaccionGlobalTitulados", obtenerBalancePregunta("TIT_LIKERT_SATISFACCION_GLOBAL", importacionTitId));
        res.put("concordanciaMercadoTitulados", obtenerBalancePregunta("TIT_LIKERT_CONCORDANCIA_MERCADO", importacionTitId));
        res.put("pertinenciaPuestoTitulados", obtenerBalancePregunta("TIT_LIKERT_PERTINENCIA_PUESTO", importacionTitId));
        res.put("aspectosUtilesCarrera", obtenerBalancePregunta("TIT_MULT_ASPECTOS_UTILES", importacionTitId));
        res.put("aspectosMejorarCarrera", obtenerBalancePregunta("TIT_MULT_ASPECTOS_MEJORAR", importacionTitId));
        res.put("asignaturasVentaja", obtenerBalancePregunta("TIT_MULT_ASIG_VENTAJA", importacionTitId));
        res.put("asignaturasNoUtiles", obtenerBalancePregunta("TIT_MULT_ASIG_NO_UTIL", importacionTitId));

        List<Map<String, Object>> itemsEmpleadores = new ArrayList<>();
        for (int i = 1; i <= 18; i++) {
            itemsEmpleadores.add(obtenerBalancePregunta(String.format("EMP_LIKERT_%02d", i), importacionEmpId));
        }
        res.put("valoracionEmpleadores", itemsEmpleadores);
        res.put("demandaNivelAcademico", obtenerBalancePregunta("EMP_NIVEL_DEMANDADO", importacionEmpId));
        res.put("probabilidadContratacion", obtenerBalancePregunta("EMP_PROB_CONTRATACION", importacionEmpId));
        res.put("cargosDemandados", obtenerBalancePregunta("EMP_MULT_CARGOS", importacionEmpId));
        return res;
    }

    // 6. Simulación de escenarios (What-If)
    public Map<String, Object> simularEscenario(double deltaPasantiasPct, double deltaPosgradoPct, Long importacionId) {
        Map<String, Object> perfil = obtenerPerfilEmpleabilidad(5.0, importacionId);
        @SuppressWarnings("unchecked")
        Map<String, Object> estado = (Map<String, Object>) perfil.get("estadoLaboral");
        long total = ((Number) estado.get("n")).longValue();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dist = (List<Map<String, Object>>) estado.get("distribucion");
        long desempleadosActual = dist.stream()
            .filter(d -> String.valueOf(d.get("categoria")).toLowerCase().contains("no trabajo"))
            .mapToLong(d -> ((Number) d.get("frecuencia")).longValue())
            .sum();

        long ocupadosActual = total - desempleadosActual;
        double tasaActual = total > 0 ? (ocupadosActual * 100.0) / total : 0.0;

        double factorAbsorcion = Math.min(0.85, (deltaPasantiasPct * 0.0045) + (deltaPosgradoPct * 0.0035));
        long nuevosOcupados = Math.round(desempleadosActual * factorAbsorcion);
        long ocupadosProyectados = Math.min(total, ocupadosActual + nuevosOcupados);
        double tasaProyectada = total > 0 ? (ocupadosProyectados * 100.0) / total : 0.0;

        return Map.of(
            "totalTitulados", total,
            "ocupadosActual", ocupadosActual,
            "tasaOcupacionActualPct", Math.round(tasaActual * 10.0) / 10.0,
            "nuevosEmpleosEstimados", nuevosOcupados,
            "ocupadosProyectados", ocupadosProyectados,
            "tasaOcupacionProyectadaPct", Math.round(tasaProyectada * 10.0) / 10.0,
            "gananciaPuntosPct", Math.round((tasaProyectada - tasaActual) * 10.0) / 10.0
        );
    }

    private List<String> obtenerOrdenCategorias(String preguntaCodigo) {
        return jdbcTemplate.queryForList(
            "SELECT valor FROM public.opcion WHERE pregunta_codigo = ? ORDER BY orden ASC",
            String.class, preguntaCodigo
        );
    }
}