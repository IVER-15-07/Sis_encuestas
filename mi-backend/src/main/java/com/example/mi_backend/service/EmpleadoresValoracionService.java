package com.example.mi_backend.service;

import com.example.mi_backend.dto.EmpleadoresFiltroDTO;
import org.apache.commons.math3.distribution.TDistribution;
import org.apache.commons.math3.stat.correlation.SpearmansCorrelation;
import org.apache.commons.math3.stat.inference.MannWhitneyUTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class EmpleadoresValoracionService {

    private final JdbcTemplate jdbcTemplate;

    private static final List<String> DIMENSIONES_ORDEN = List.of(
        "Confianza en la formación",
        "Desempeño y perfil",
        "Conocimiento del perfil",
        "Escucha de la Carrera",
        "Participación del empleador",
        "Vinculación laboral"
    );

    private static final Map<String, String> DIMENSION_POR_CODIGO = Map.ofEntries(
        Map.entry("EMP_LIKERT_01", "Confianza en la formación"),
        Map.entry("EMP_LIKERT_02", "Confianza en la formación"),
        Map.entry("EMP_LIKERT_06", "Confianza en la formación"),
        Map.entry("EMP_LIKERT_05", "Desempeño y perfil"),
        Map.entry("EMP_LIKERT_08", "Desempeño y perfil"),
        Map.entry("EMP_LIKERT_09", "Desempeño y perfil"),
        Map.entry("EMP_LIKERT_04", "Conocimiento del perfil"),
        Map.entry("EMP_LIKERT_03", "Escucha de la Carrera"),
        Map.entry("EMP_LIKERT_07", "Escucha de la Carrera"),
        Map.entry("EMP_LIKERT_15", "Escucha de la Carrera"),
        Map.entry("EMP_LIKERT_16", "Escucha de la Carrera"),
        Map.entry("EMP_LIKERT_18", "Escucha de la Carrera"),
        Map.entry("EMP_LIKERT_10", "Participación del empleador"),
        Map.entry("EMP_LIKERT_12", "Participación del empleador"),
        Map.entry("EMP_LIKERT_13", "Participación del empleador"),
        Map.entry("EMP_LIKERT_14", "Participación del empleador"),
        Map.entry("EMP_LIKERT_11", "Vinculación laboral"),
        Map.entry("EMP_LIKERT_17", "Vinculación laboral")
    );

    private static final Map<String, String> ETIQUETA_AFIRMACION = Map.ofEntries(
        Map.entry("EMP_LIKERT_01", "Brinda confianza"),
        Map.entry("EMP_LIKERT_02", "Título consistente con competencias"),
        Map.entry("EMP_LIKERT_03", "Autoridades consultan la opinión"),
        Map.entry("EMP_LIKERT_04", "Conoce el perfil de egreso"),
        Map.entry("EMP_LIKERT_05", "Perfil coherente con el desempeño"),
        Map.entry("EMP_LIKERT_06", "Formación permite desempeño destacado"),
        Map.entry("EMP_LIKERT_07", "Incorpora necesidades del sector"),
        Map.entry("EMP_LIKERT_08", "Evidencia competencias laborales"),
        Map.entry("EMP_LIKERT_09", "Valores y actitudes de los titulados"),
        Map.entry("EMP_LIKERT_10", "Participa en retroalimentación"),
        Map.entry("EMP_LIKERT_11", "Mantiene vínculos con organizaciones"),
        Map.entry("EMP_LIKERT_12", "Participa en vinculación con el entorno"),
        Map.entry("EMP_LIKERT_13", "Participa en difusión de oportunidades"),
        Map.entry("EMP_LIKERT_14", "Participa en vinculación profesional"),
        Map.entry("EMP_LIKERT_15", "Ha sido consultado sobre el desempeño"),
        Map.entry("EMP_LIKERT_16", "Consulta sobre pertinencia de la formación"),
        Map.entry("EMP_LIKERT_17", "Recurre a la Universidad para contratar"),
        Map.entry("EMP_LIKERT_18", "Es consultado periódicamente")
    );

    private static final List<String> ORDEN_TAMANO = List.of(
        "Micro (hasta 10 funcionarios)",
        "Pequeña (entre 11 a 30 funcionarios)",
        "Mediana (entre 31 a 99 funcionarios)",
        "Grande (100 funcionarios o más)"
    );

    private static final List<String> ORDEN_PROB_CONTRATACION = List.of(
        "No se tiene prevista la contratación actualmente",
        "Sí, dependiendo del crecimiento o nuevos proyectos de la organización",
        "Sí, existe una alta probabilidad de contratación"
    );

    public EmpleadoresValoracionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> obtenerValoracionCarrera(EmpleadoresFiltroDTO f) {
        List<Object> params = new ArrayList<Object>();
        String where = construirWhere(f, params);

        long totalUniverso = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.respuesta r WHERE r.tipo = 'empleador'" +
            (f.getImportacionId() != null && f.getImportacionId() > 0 ? " AND r.importacion_id = " + f.getImportacionId() : ""),
            Long.class
        );

        List<Map<String, Object>> empleadores = jdbcTemplate.queryForList(
            "SELECT e.id, e.tipo_organizacion, e.tamano, e.rubro, e.contrato_ultimos_5, e.prob_contratacion " +
            "FROM public.empleador e JOIN public.respuesta r ON r.id = e.id WHERE r.tipo = 'empleador' " + where,
            params.toArray()
        );

        long nFiltrado = empleadores.size();
        Map<Long, Map<String, Object>> infoEmpleador = new HashMap<Long, Map<String, Object>>();
        for (Map<String, Object> emp : empleadores) {
            infoEmpleador.put(((Number) emp.get("id")).longValue(), emp);
        }

        String sqlLikert = "SELECT rl.respuesta_id, rl.pregunta_codigo, o.valor, o.puntaje " +
                           "FROM public.respuesta_likert rl " +
                           "JOIN public.opcion o ON o.id = rl.opcion_id " +
                           "JOIN public.respuesta r ON r.id = rl.respuesta_id " +
                           "JOIN public.empleador e ON e.id = r.id " +
                           "WHERE r.tipo = 'empleador' AND rl.pregunta_codigo LIKE 'EMP_LIKERT_%' " + where;

        List<Map<String, Object>> respuestasLikert = jdbcTemplate.queryForList(sqlLikert, params.toArray());

        // Mapas por empleador -> pregunta -> puntaje 0..100 (Totalmente de acuerdo = 100, Parcialmente = 50, Desacuerdo = 0)
        Map<Long, Map<String, Double>> puntaje0a100PorEmpPregunta = new HashMap<Long, Map<String, Double>>();
        Map<Long, Set<String>> valoresUnicosPorEmp = new HashMap<Long, Set<String>>();
        Map<String, long[]> conteosPorPregunta = new HashMap<String, long[]>(); // [0:desacuerdo, 1:parcial, 2:total, 3:nosabe]

        for (String cod : DIMENSION_POR_CODIGO.keySet()) {
            conteosPorPregunta.put(cod, new long[4]);
        }

        long totalCeldasEvaluadas = 0L;
        long totalNoSabe = 0L;
        long totalAcuerdo = 0L;
        long totalDesacuerdo = 0L;

        for (Map<String, Object> row : respuestasLikert) {
            Long empId = ((Number) row.get("respuesta_id")).longValue();
            String cod = String.valueOf(row.get("pregunta_codigo"));
            String val = String.valueOf(row.get("valor"));
            Object ptsObj = row.get("puntaje");

            if (!conteosPorPregunta.containsKey(cod)) {
                continue;
            }

            totalCeldasEvaluadas++;
            valoresUnicosPorEmp.computeIfAbsent(empId, k -> new HashSet<String>()).add(val);
            long[] arr = conteosPorPregunta.get(cod);

            if (ptsObj == null) {
                arr[3]++;
                totalNoSabe++;
            } else {
                int pts = ((Number) ptsObj).intValue();
                double esc100 = pts == 3 ? 100.0 : (pts == 2 ? 50.0 : 0.0);
                puntaje0a100PorEmpPregunta
                    .computeIfAbsent(empId, k -> new HashMap<String, Double>())
                    .put(cod, esc100);

                if (pts == 1) {
                    arr[0]++;
                    totalDesacuerdo++;
                } else if (pts == 2) {
                    arr[1]++;
                } else if (pts == 3) {
                    arr[2]++;
                    totalAcuerdo++;
                }
            }
        }

        long flatlinersCount = 0L;
        for (Set<String> vals : valoresUnicosPorEmp.values()) {
            if (vals.size() == 1) {
                flatlinersCount++;
            }
        }

        // Puntaje promedio por empleador y dimensión (0..100)
        Map<Long, Map<String, Double>> puntajeDimPorEmp = new HashMap<Long, Map<String, Double>>();
        Map<Long, Double> puntajeGlobalPorEmp = new HashMap<Long, Double>();

        for (Long empId : infoEmpleador.keySet()) {
            Map<String, Double> respEmp = puntaje0a100PorEmpPregunta.getOrDefault(empId, Collections.<String, Double>emptyMap());
            Map<String, List<Double>> acumDim = new HashMap<String, List<Double>>();
            List<Double> todasValidas = new ArrayList<Double>();

            for (Map.Entry<String, Double> e : respEmp.entrySet()) {
                String dim = DIMENSION_POR_CODIGO.get(e.getKey());
                acumDim.computeIfAbsent(dim, k -> new ArrayList<Double>()).add(e.getValue());
                todasValidas.add(e.getValue());
            }

            Map<String, Double> promDims = new HashMap<String, Double>();
            for (Map.Entry<String, List<Double>> d : acumDim.entrySet()) {
                double avg = d.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                promDims.put(d.getKey(), avg);
            }
            puntajeDimPorEmp.put(empId, promDims);

            if (!todasValidas.isEmpty()) {
                double avgGlobal = todasValidas.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                puntajeGlobalPorEmp.put(empId, avgGlobal);
            }
        }

        // 1. Tarjetas por dimensión
        List<Map<String, Object>> tarjetasDimensiones = new ArrayList<Map<String, Object>>();
        Map<String, Object> mejorDim = null;
        Map<String, Object> peorDim = null;

        for (String dim : DIMENSIONES_ORDEN) {
            List<String> codsDim = new ArrayList<String>();
            for (Map.Entry<String, String> entry : DIMENSION_POR_CODIGO.entrySet()) {
                if (dim.equals(entry.getValue())) {
                    codsDim.add(entry.getKey());
                }
            }

            long dDes = 0L;
            long dPar = 0L;
            long dTot = 0L;
            long dNs = 0L;
            for (String c : codsDim) {
                long[] a = conteosPorPregunta.get(c);
                dDes += a[0];
                dPar += a[1];
                dTot += a[2];
                dNs += a[3];
            }

            long totalRespDim = dDes + dPar + dTot + dNs;
            long validasDim = dDes + dPar + dTot;
            long puntajeRedondeado = validasDim > 0 ? Math.round(((dTot * 100.0) + (dPar * 50.0)) / validasDim) : 0L;

            long nOrgsDim = 0L;
            for (Map<String, Double> m : puntajeDimPorEmp.values()) {
                if (m.containsKey(dim)) {
                    nOrgsDim++;
                }
            }

            Map<String, Object> card = new LinkedHashMap<String, Object>();
            card.put("dimension", dim);
            card.put("afirmacionesCount", codsDim.size());
            card.put("n", nOrgsDim);
            card.put("puntaje", puntajeRedondeado);
            card.put("acuerdoTotalPct", totalRespDim > 0 ? Math.round((dTot * 100.0) / totalRespDim) : 0L);
            card.put("parcialAcuerdoPct", totalRespDim > 0 ? Math.round((dPar * 100.0) / totalRespDim) : 0L);
            card.put("desacuerdoPct", totalRespDim > 0 ? Math.round((dDes * 100.0) / totalRespDim) : 0L);
            card.put("noSabePct", totalRespDim > 0 ? Math.round((dNs * 100.0) / totalRespDim) : 0L);
            tarjetasDimensiones.add(card);

            if (mejorDim == null || puntajeRedondeado > ((Number) mejorDim.get("puntaje")).longValue()) {
                mejorDim = card;
            }
            if (peorDim == null || puntajeRedondeado < ((Number) peorDim.get("puntaje")).longValue()) {
                peorDim = card;
            }
        }

        // 2. Afirmaciones ordenadas por puntaje (0..100)
        List<Map<String, Object>> afirmacionesOrdenadas = new ArrayList<Map<String, Object>>();
        for (String cod : DIMENSION_POR_CODIGO.keySet()) {
            long[] a = conteosPorPregunta.get(cod);
            long totResp = a[0] + a[1] + a[2] + a[3];
            long valResp = a[0] + a[1] + a[2];
            long pts = valResp > 0 ? Math.round(((a[2] * 100.0) + (a[1] * 50.0)) / valResp) : 0L;

            Map<String, Object> af = new LinkedHashMap<String, Object>();
            af.put("codigo", cod);
            af.put("etiqueta", ETIQUETA_AFIRMACION.getOrDefault(cod, cod));
            af.put("dimension", DIMENSION_POR_CODIGO.get(cod));
            af.put("puntaje", pts);
            af.put("desacuerdoPct", totResp > 0 ? Math.round((a[0] * 1000.0) / totResp) / 10.0 : 0.0);
            af.put("parcialPct", totResp > 0 ? Math.round((a[1] * 1000.0) / totResp) / 10.0 : 0.0);
            af.put("acuerdoTotalPct", totResp > 0 ? Math.round((a[2] * 1000.0) / totResp) / 10.0 : 0.0);
            af.put("noSabePct", totResp > 0 ? Math.round((a[3] * 100.0) / totResp) : 0L);
            afirmacionesOrdenadas.add(af);
        }
        afirmacionesOrdenadas.sort((x, y) -> Long.compare(
            ((Number) y.get("puntaje")).longValue(),
            ((Number) x.get("puntaje")).longValue()
        ));

        // 3. Segmentaciones con U de Mann-Whitney (2 grupos) y rho de Spearman (ordinales)
        List<Map<String, Object>> bloquesSegmentacion = new ArrayList<Map<String, Object>>();
        bloquesSegmentacion.add(construirSegmentoMannWhitney(
            "Tipo de organización", "tipo_organizacion", List.of("Público", "Privado"),
            infoEmpleador, puntajeGlobalPorEmp, puntajeDimPorEmp
        ));
        bloquesSegmentacion.add(construirSegmentoSpearman(
            "Tamaño de la organización", "tamano", ORDEN_TAMANO,
            infoEmpleador, puntajeGlobalPorEmp, puntajeDimPorEmp
        ));
        bloquesSegmentacion.add(construirSegmentoMannWhitneyBooleano(
            "Contrató en los últimos 5 años",
            infoEmpleador, puntajeGlobalPorEmp, puntajeDimPorEmp
        ));
        bloquesSegmentacion.add(construirSegmentoSpearman(
            "Posibilidad de contratar", "prob_contratacion", ORDEN_PROB_CONTRATACION,
            infoEmpleador, puntajeGlobalPorEmp, puntajeDimPorEmp
        ));

        // 4. Matriz cruzada: Conocimiento del perfil (EMP_LIKERT_04) x Coherencia con desempeño (EMP_LIKERT_05)
        Map<String, Object> crucePerfilCoherencia = construirCrucePerfilVsCoherencia(where, params);

        // 5. Matriz triangular de correlaciones rho de Spearman entre las 6 dimensiones
        Map<String, Object> correlacionDimensiones = construirMatrizCorrelacionDimensiones(puntajeDimPorEmp);

        // Resumen KPIs superiores
        long validasGlobales = totalCeldasEvaluadas - totalNoSabe;
        long puntajeGlobal = validasGlobales > 0
            ? Math.round(((totalAcuerdo * 100.0) + ((validasGlobales - totalAcuerdo - totalDesacuerdo) * 50.0)) / validasGlobales)
            : 0L;

        Map<String, Object> kpis = new LinkedHashMap<String, Object>();
        kpis.put("puntajeGlobal", puntajeGlobal);
        kpis.put("acuerdoTotalPct", totalCeldasEvaluadas > 0 ? Math.round((totalAcuerdo * 100.0) / totalCeldasEvaluadas) : 0L);
        kpis.put("desacuerdoPct", totalCeldasEvaluadas > 0 ? Math.round((totalDesacuerdo * 100.0) / totalCeldasEvaluadas) : 0L);
        kpis.put("mejorDimension", mejorDim);
        kpis.put("peorDimension", peorDim);
        kpis.put("noSabePct", totalCeldasEvaluadas > 0 ? Math.round((totalNoSabe * 1000.0) / totalCeldasEvaluadas) / 10.0 : 0.0);
        kpis.put("flatlinersCount", flatlinersCount);
        kpis.put("n", nFiltrado);

        Map<String, Object> resultado = new LinkedHashMap<String, Object>();
        resultado.put("totalUniverso", totalUniverso);
        resultado.put("totalFiltrado", nFiltrado);
        resultado.put("kpis", kpis);
        resultado.put("dimensiones", tarjetasDimensiones);
        resultado.put("afirmaciones", afirmacionesOrdenadas);
        resultado.put("segmentaciones", bloquesSegmentacion);
        resultado.put("crucePerfilCoherencia", crucePerfilCoherencia);
        resultado.put("correlacionDimensiones", correlacionDimensiones);
        return resultado;
    }

    private Map<String, Object> construirSegmentoMannWhitney(
            String titulo, String campo, List<String> grupos,
            Map<Long, Map<String, Object>> infoEmp,
            Map<Long, Double> globalEmp,
            Map<Long, Map<String, Double>> dimEmp) {

        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        List<double[]> muestrasPorGrupo = new ArrayList<double[]>();

        for (String g : grupos) {
            List<Double> valsGrupo = new ArrayList<Double>();
            Map<String, List<Double>> valsPorDim = new HashMap<String, List<Double>>();

            for (Map.Entry<Long, Map<String, Object>> e : infoEmp.entrySet()) {
                Long id = e.getKey();
                Object valCampo = e.getValue().get(campo);
                if (valCampo != null && g.equals(String.valueOf(valCampo)) && globalEmp.containsKey(id)) {
                    valsGrupo.add(globalEmp.get(id));
                    Map<String, Double> dMap = dimEmp.getOrDefault(id, Collections.<String, Double>emptyMap());
                    for (String dim : DIMENSIONES_ORDEN) {
                        if (dMap.containsKey(dim)) {
                            valsPorDim.computeIfAbsent(dim, k -> new ArrayList<Double>()).add(dMap.get(dim));
                        }
                    }
                }
            }

            double[] arr = valsGrupo.stream().mapToDouble(Double::doubleValue).toArray();
            muestrasPorGrupo.add(arr);

            Map<String, Long> puntajesDims = new LinkedHashMap<String, Long>();
            for (String dim : DIMENSIONES_ORDEN) {
                List<Double> ld = valsPorDim.getOrDefault(dim, Collections.<Double>emptyList());
                puntajesDims.put(dim, ld.isEmpty() ? 0L : Math.round(ld.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
            }

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("grupo", g);
            fila.put("n", arr.length);
            fila.put("global", arr.length > 0 ? Math.round(valsGrupo.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)) : 0L);
            fila.put("dimensiones", puntajesDims);
            filas.add(fila);
        }

        double pValor = 1.0;
        double rBiserial = 0.0;
        if (muestrasPorGrupo.size() == 2 && muestrasPorGrupo.get(0).length > 0 && muestrasPorGrupo.get(1).length > 0) {
            double[] x = muestrasPorGrupo.get(0);
            double[] y = muestrasPorGrupo.get(1);
            MannWhitneyUTest mw = new MannWhitneyUTest();
            double u = mw.mannWhitneyU(x, y);
            pValor = mw.mannWhitneyUTest(x, y);
            rBiserial = (2.0 * u) / (x.length * y.length) - 1.0;
        }

        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", "U de Mann-Whitney");
        prueba.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        prueba.put("correlacionBiserial", Math.round(rBiserial * 100.0) / 100.0);
        prueba.put("significativo", pValor < 0.05);

        Map<String, Object> bloque = new LinkedHashMap<String, Object>();
        bloque.put("titulo", titulo);
        bloque.put("prueba", prueba);
        bloque.put("filas", filas);
        return bloque;
    }

    private Map<String, Object> construirSegmentoMannWhitneyBooleano(
            String titulo,
            Map<Long, Map<String, Object>> infoEmp,
            Map<Long, Double> globalEmp,
            Map<Long, Map<String, Double>> dimEmp) {

        List<Boolean> estados = List.of(Boolean.TRUE, Boolean.FALSE);
        List<String> etiquetas = List.of("Sí", "No");
        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        List<double[]> muestras = new ArrayList<double[]>();

        for (int idx = 0; idx < estados.size(); idx++) {
            Boolean target = estados.get(idx);
            List<Double> valsGrupo = new ArrayList<Double>();
            Map<String, List<Double>> valsPorDim = new HashMap<String, List<Double>>();

            for (Map.Entry<Long, Map<String, Object>> e : infoEmp.entrySet()) {
                Long id = e.getKey();
                Object valCampo = e.getValue().get("contrato_ultimos_5");
                if (target.equals(valCampo) && globalEmp.containsKey(id)) {
                    valsGrupo.add(globalEmp.get(id));
                    Map<String, Double> dMap = dimEmp.getOrDefault(id, Collections.<String, Double>emptyMap());
                    for (String dim : DIMENSIONES_ORDEN) {
                        if (dMap.containsKey(dim)) {
                            valsPorDim.computeIfAbsent(dim, k -> new ArrayList<Double>()).add(dMap.get(dim));
                        }
                    }
                }
            }

            double[] arr = valsGrupo.stream().mapToDouble(Double::doubleValue).toArray();
            muestras.add(arr);

            Map<String, Long> puntajesDims = new LinkedHashMap<String, Long>();
            for (String dim : DIMENSIONES_ORDEN) {
                List<Double> ld = valsPorDim.getOrDefault(dim, Collections.<Double>emptyList());
                puntajesDims.put(dim, ld.isEmpty() ? 0L : Math.round(ld.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
            }

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("grupo", etiquetas.get(idx));
            fila.put("n", arr.length);
            fila.put("global", arr.length > 0 ? Math.round(valsGrupo.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)) : 0L);
            fila.put("dimensiones", puntajesDims);
            filas.add(fila);
        }

        double pValor = 1.0;
        double rBiserial = 0.0;
        if (muestras.get(0).length > 0 && muestras.get(1).length > 0) {
            double[] x = muestras.get(0);
            double[] y = muestras.get(1);
            MannWhitneyUTest mw = new MannWhitneyUTest();
            double u = mw.mannWhitneyU(x, y);
            pValor = mw.mannWhitneyUTest(x, y);
            rBiserial = (2.0 * u) / (x.length * y.length) - 1.0;
        }

        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", "U de Mann-Whitney");
        prueba.put("pValor", Math.round(pValor * 1000.0) / 1000.0);
        prueba.put("correlacionBiserial", Math.round(rBiserial * 100.0) / 100.0);
        prueba.put("significativo", pValor < 0.05);

        Map<String, Object> bloque = new LinkedHashMap<String, Object>();
        bloque.put("titulo", titulo);
        bloque.put("prueba", prueba);
        bloque.put("filas", filas);
        return bloque;
    }

    private Map<String, Object> construirSegmentoSpearman(
            String titulo, String campo, List<String> ordenCategorias,
            Map<Long, Map<String, Object>> infoEmp,
            Map<Long, Double> globalEmp,
            Map<Long, Map<String, Double>> dimEmp) {

        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        List<Double> xOrden = new ArrayList<Double>();
        List<Double> yPuntaje = new ArrayList<Double>();

        for (int idx = 0; idx < ordenCategorias.size(); idx++) {
            String cat = ordenCategorias.get(idx);
            List<Double> valsGrupo = new ArrayList<Double>();
            Map<String, List<Double>> valsPorDim = new HashMap<String, List<Double>>();

            for (Map.Entry<Long, Map<String, Object>> e : infoEmp.entrySet()) {
                Long id = e.getKey();
                Object valCampo = e.getValue().get(campo);
                if (valCampo != null && cat.equals(String.valueOf(valCampo)) && globalEmp.containsKey(id)) {
                    double pg = globalEmp.get(id);
                    valsGrupo.add(pg);
                    xOrden.add((double) (idx + 1));
                    yPuntaje.add(pg);

                    Map<String, Double> dMap = dimEmp.getOrDefault(id, Collections.<String, Double>emptyMap());
                    for (String dim : DIMENSIONES_ORDEN) {
                        if (dMap.containsKey(dim)) {
                            valsPorDim.computeIfAbsent(dim, k -> new ArrayList<Double>()).add(dMap.get(dim));
                        }
                    }
                }
            }

            Map<String, Long> puntajesDims = new LinkedHashMap<String, Long>();
            for (String dim : DIMENSIONES_ORDEN) {
                List<Double> ld = valsPorDim.getOrDefault(dim, Collections.<Double>emptyList());
                puntajesDims.put(dim, ld.isEmpty() ? 0L : Math.round(ld.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
            }

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("grupo", cat);
            fila.put("n", valsGrupo.size());
            fila.put("global", valsGrupo.isEmpty() ? 0L : Math.round(valsGrupo.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
            fila.put("dimensiones", puntajesDims);
            filas.add(fila);
        }

        double[] sp = calcularSpearmanConPValor(
            xOrden.stream().mapToDouble(Double::doubleValue).toArray(),
            yPuntaje.stream().mapToDouble(Double::doubleValue).toArray()
        );

        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", "rho de Spearman");
        prueba.put("rho", sp[0]);
        prueba.put("pValor", sp[1]);
        prueba.put("significativo", sp[1] < 0.05);

        Map<String, Object> bloque = new LinkedHashMap<String, Object>();
        bloque.put("titulo", titulo);
        bloque.put("prueba", prueba);
        bloque.put("filas", filas);
        return bloque;
    }

    private Map<String, Object> construirCrucePerfilVsCoherencia(String where, List<Object> baseParams) {
        String sql = "SELECT oa.puntaje AS pts_fila, ob.puntaje AS pts_col " +
                     "FROM public.respuesta_likert rla " +
                     "JOIN public.opcion oa ON oa.id = rla.opcion_id " +
                     "JOIN public.respuesta_likert rlb ON rlb.respuesta_id = rla.respuesta_id " +
                     "JOIN public.opcion ob ON ob.id = rlb.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rla.respuesta_id " +
                     "JOIN public.empleador e ON e.id = r.id " +
                     "WHERE rla.pregunta_codigo = 'EMP_LIKERT_04' " +
                     "AND rlb.pregunta_codigo = 'EMP_LIKERT_05' " +
                     "AND oa.puntaje IS NOT NULL AND ob.puntaje IS NOT NULL " + where;

        List<Map<String, Object>> pares = jdbcTemplate.queryForList(sql, baseParams.toArray());
        List<String> etiquetas = List.of("Totalmente desacuerdo", "Parcialmente de acuerdo", "Totalmente de acuerdo");

        long[][] matriz = new long[3][3];
        long[] totFila = new long[3];
        double[] xVals = new double[pares.size()];
        double[] yVals = new double[pares.size()];

        for (int idx = 0; idx < pares.size(); idx++) {
            int px = ((Number) pares.get(idx).get("pts_fila")).intValue();
            int py = ((Number) pares.get(idx).get("pts_col")).intValue();
            int i = Math.max(0, Math.min(2, px - 1));
            int j = Math.max(0, Math.min(2, py - 1));
            matriz[i][j]++;
            totFila[i]++;
            xVals[idx] = px;
            yVals[idx] = py;
        }

        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < 3; i++) {
            List<Map<String, Object>> celdas = new ArrayList<Map<String, Object>>();
            for (int j = 0; j < 3; j++) {
                long v = matriz[i][j];
                double pct = totFila[i] > 0 ? Math.round((v * 1000.0) / totFila[i]) / 10.0 : 0.0;
                Map<String, Object> c = new LinkedHashMap<String, Object>();
                c.put("columna", etiquetas.get(j));
                c.put("frecuencia", v);
                c.put("porcentajeFila", pct);
                celdas.add(c);
            }
            Map<String, Object> fObj = new LinkedHashMap<String, Object>();
            fObj.put("etiqueta", etiquetas.get(i));
            fObj.put("nFila", totFila[i]);
            fObj.put("celdas", celdas);
            filas.add(fObj);
        }

        double[] sp = calcularSpearmanConPValor(xVals, yVals);
        Map<String, Object> prueba = new LinkedHashMap<String, Object>();
        prueba.put("nombre", "rho de Spearman");
        prueba.put("rho", sp[0]);
        prueba.put("pValor", sp[1]);
        prueba.put("significativo", sp[1] < 0.05);

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("n", pares.size());
        res.put("columnas", etiquetas);
        res.put("filas", filas);
        res.put("prueba", prueba);
        return res;
    }

    private Map<String, Object> construirMatrizCorrelacionDimensiones(Map<Long, Map<String, Double>> puntajeDimPorEmp) {
        int m = DIMENSIONES_ORDEN.size();
        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();

        for (int i = 1; i < m; i++) {
            String dimFila = DIMENSIONES_ORDEN.get(i);
            List<Map<String, Object>> celdas = new ArrayList<Map<String, Object>>();

            for (int j = 0; j < i; j++) {
                String dimCol = DIMENSIONES_ORDEN.get(j);
                List<Double> xList = new ArrayList<Double>();
                List<Double> yList = new ArrayList<Double>();

                for (Map<String, Double> empDims : puntajeDimPorEmp.values()) {
                    if (empDims.containsKey(dimFila) && empDims.containsKey(dimCol)) {
                        xList.add(empDims.get(dimFila));
                        yList.add(empDims.get(dimCol));
                    }
                }

                double[] sp = calcularSpearmanConPValor(
                    xList.stream().mapToDouble(Double::doubleValue).toArray(),
                    yList.stream().mapToDouble(Double::doubleValue).toArray()
                );

                Map<String, Object> celda = new LinkedHashMap<String, Object>();
                celda.put("dimensionColumna", dimCol);
                celda.put("rho", sp[0]);
                celda.put("pValor", sp[1]);
                celda.put("significativo", sp[1] < 0.05);
                celdas.add(celda);
            }

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("dimensionFila", dimFila);
            fila.put("celdas", celdas);
            filas.add(fila);
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("columnas", DIMENSIONES_ORDEN.subList(0, m - 1));
        res.put("filas", filas);
        return res;
    }

    private double[] calcularSpearmanConPValor(double[] x, double[] y) {
        int n = x.length;
        if (n < 4) {
            return new double[]{0.0, 1.0};
        }
        SpearmansCorrelation sc = new SpearmansCorrelation();
        double rho = sc.correlation(x, y);
        if (Double.isNaN(rho)) {
            return new double[]{0.0, 1.0};
        }
        double pValor;
        if (Math.abs(rho) >= 0.999999) {
            pValor = 0.0;
        } else {
            double tStat = Math.abs(rho) * Math.sqrt((n - 2.0) / (1.0 - rho * rho));
            TDistribution tDist = new TDistribution(n - 2.0);
            pValor = 2.0 * (1.0 - tDist.cumulativeProbability(tStat));
        }
        return new double[]{
            Math.round(rho * 100.0) / 100.0,
            Math.round(pValor * 1000.0) / 1000.0
        };
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