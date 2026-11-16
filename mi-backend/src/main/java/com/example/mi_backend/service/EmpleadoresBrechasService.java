package com.example.mi_backend.service;

import com.example.mi_backend.dto.EmpleadoresFiltroDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class EmpleadoresBrechasService {

    private final JdbcTemplate jdbcTemplate;

    private static final Map<String, Pattern> HARD_SKILLS_PATTERNS = crearPatronesHardSkills();
    private static final Map<String, Pattern> SOFT_SKILLS_PATTERNS = crearPatronesSoftSkills();

    private static final List<String> ITEMS_LIKERT_COMPETENCIAS = List.of(
        "EMP_LIKERT_08",
        "EMP_LIKERT_02",
        "EMP_LIKERT_05",
        "EMP_LIKERT_06",
        "EMP_LIKERT_09"
    );

    private static final Map<String, String> ETIQUETAS_LIKERT_COMP = Map.of(
        "EMP_LIKERT_08", "Competencias laborales y resolución de problemas",
        "EMP_LIKERT_02", "Consistencia del título con competencias demostradas",
        "EMP_LIKERT_05", "Coherencia entre perfil declarado y desempeño",
        "EMP_LIKERT_06", "Desempeño destacado e integral en la organización",
        "EMP_LIKERT_09", "Ética profesional, responsabilidad social y valores"
    );

    public EmpleadoresBrechasService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> obtenerBrechasCompetenciasEmpleadores(EmpleadoresFiltroDTO f) {
        List<Object> params = new ArrayList<Object>();
        String where = construirWhere(f, params);

        long totalUniverso = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM public.respuesta r WHERE r.tipo = 'empleador'" +
            (f.getImportacionId() != null && f.getImportacionId() > 0 ? " AND r.importacion_id = " + f.getImportacionId() : ""),
            Long.class
        );

        String sql = "SELECT e.id, e.areas_emergentes, e.herramientas, e.habilidades " +
                     "FROM public.empleador e " +
                     "JOIN public.respuesta r ON r.id = e.id " +
                     "WHERE r.tipo = 'empleador' " + where;

        List<Map<String, Object>> filasEmp = jdbcTemplate.queryForList(sql, params.toArray());
        long nFiltrado = filasEmp.size();

        Map<String, Object> hardSkills = evaluarTaxonomiaCompetencias(
            filasEmp, HARD_SKILLS_PATTERNS, "Hard skills", where, params
        );
        Map<String, Object> softSkills = evaluarTaxonomiaCompetencias(
            filasEmp, SOFT_SKILLS_PATTERNS, "Soft skills", where, params
        );

        Map<String, Object> mapaPreparacionLikert = construirMapaPreparacionLikert(where, params);
        Map<String, Object> topTerminosRaw = extraerTerminosFrecuentesRaw(filasEmp);

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("totalUniverso", totalUniverso);
        res.put("totalFiltrado", nFiltrado);
        res.put("hardSkills", hardSkills);
        res.put("softSkills", softSkills);
        res.put("mapaPreparacionLikert", mapaPreparacionLikert);
        res.put("terminosDirectos", topTerminosRaw);
        return res;
    }

    private Map<String, Object> evaluarTaxonomiaCompetencias(
            List<Map<String, Object>> filasEmp,
            Map<String, Pattern> patrones,
            String tipoSkill,
            String where,
            List<Object> params) {

        long nTotal = filasEmp.size();

        // Índice de preparación promedio (1.0 a 5.0) declarado por cada empleador en sus respuestas Likert de competencias
        Map<Long, Double> preparacionPorEmp = obtenerIndicePreparacionPorEmpleador(where, params);

        Map<String, Long> mencionesPorComp = new LinkedHashMap<String, Long>();
        Map<String, List<Double>> scoresPorComp = new LinkedHashMap<String, List<Double>>();

        for (String comp : patrones.keySet()) {
            mencionesPorComp.put(comp, 0L);
            scoresPorComp.put(comp, new ArrayList<Double>());
        }

        for (Map<String, Object> emp : filasEmp) {
            Long empId = ((Number) emp.get("id")).longValue();
            String textoConcat = (
                (emp.get("areas_emergentes") != null ? String.valueOf(emp.get("areas_emergentes")) : "") + " " +
                (emp.get("herramientas") != null ? String.valueOf(emp.get("herramientas")) : "") + " " +
                (emp.get("habilidades") != null ? String.valueOf(emp.get("habilidades")) : "")
            );
            String textoNorm = normalizarSinAcentos(textoConcat);

            Double scoreEmp = preparacionPorEmp.get(empId);

            for (Map.Entry<String, Pattern> entry : patrones.entrySet()) {
                String comp = entry.getKey();
                if (entry.getValue().matcher(textoNorm).find()) {
                    mencionesPorComp.put(comp, mencionesPorComp.get(comp) + 1L);
                    if (scoreEmp != null) {
                        scoresPorComp.get(comp).add(scoreEmp);
                    }
                }
            }
        }

        List<Map<String, Object>> listaCompetencias = new ArrayList<Map<String, Object>>();
        double sumaMedias = 0.0;
        int compConDatos = 0;

        for (String comp : patrones.keySet()) {
            long menciones = mencionesPorComp.get(comp);
            double demandaPct = nTotal > 0 ? Math.round((menciones * 1000.0) / nTotal) / 10.0 : 0.0;

            List<Double> scores = scoresPorComp.get(comp);
            int nValido = scores.size();
            double media = 0.0;
            double de = 0.0;

            if (nValido > 0) {
                media = scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                if (nValido > 1) {
                    double mFinal = media;
                    double var = scores.stream().mapToDouble(v -> Math.pow(v - mFinal, 2)).sum() / (nValido - 1);
                    de = Math.sqrt(var);
                }
                sumaMedias += media;
                compConDatos++;
            }

            // Índice de brecha (0..100): combina alta demanda del mercado con déficit de preparación percibida
            double deficitNorm = nValido > 0 ? Math.max(0.0, (5.0 - media) / 4.0) : 0.5;
            double indiceBrecha = Math.round((demandaPct * deficitNorm) * 10.0) / 10.0;

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("competencia", comp);
            item.put("menciones", menciones);
            item.put("demandaPct", demandaPct);
            item.put("nValido", nValido);
            item.put("media", Math.round(media * 100.0) / 100.0);
            item.put("desviacionEstandar", Math.round(de * 100.0) / 100.0);
            item.put("indiceBrecha", indiceBrecha);
            listaCompetencias.add(item);
        }

        // Ordenar por demanda y media descendente
        listaCompetencias.sort(new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> a, Map<String, Object> b) {
                int cmp = Long.compare(((Number) b.get("menciones")).longValue(), ((Number) a.get("menciones")).longValue());
                if (cmp != 0) {
                    return cmp;
                }
                return Double.compare(((Number) b.get("media")).doubleValue(), ((Number) a.get("media")).doubleValue());
            }
        });

        Map<String, Object> masAlta = listaCompetencias.isEmpty() ? null : listaCompetencias.get(0);
        Map<String, Object> masBaja = null;
        for (int i = listaCompetencias.size() - 1; i >= 0; i--) {
            if (((Number) listaCompetencias.get(i).get("menciones")).longValue() > 0) {
                masBaja = listaCompetencias.get(i);
                break;
            }
        }
        if (masBaja == null && !listaCompetencias.isEmpty()) {
            masBaja = listaCompetencias.get(listaCompetencias.size() - 1);
        }

        double mediaGlobal = compConDatos > 0 ? Math.round((sumaMedias / compConDatos) * 100.0) / 100.0 : 0.0;

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("tipo", tipoSkill);
        res.put("competenciasEvaluadas", listaCompetencias.size());
        res.put("n", nTotal);
        res.put("mediaGlobal", mediaGlobal);
        res.put("competenciaMasAlta", masAlta);
        res.put("competenciaMasBaja", masBaja);
        res.put("items", listaCompetencias);
        return res;
    }

    private Map<Long, Double> obtenerIndicePreparacionPorEmpleador(String where, List<Object> params) {
        String sql = "SELECT rl.respuesta_id, AVG(CASE o.puntaje WHEN 1 THEN 1.0 WHEN 2 THEN 3.0 WHEN 3 THEN 5.0 ELSE NULL END) AS score_5 " +
                     "FROM public.respuesta_likert rl " +
                     "JOIN public.opcion o ON o.id = rl.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rl.respuesta_id " +
                     "JOIN public.empleador e ON e.id = r.id " +
                     "WHERE r.tipo = 'empleador' " +
                     "AND rl.pregunta_codigo IN ('EMP_LIKERT_02', 'EMP_LIKERT_05', 'EMP_LIKERT_06', 'EMP_LIKERT_08', 'EMP_LIKERT_09') " +
                     "AND o.puntaje IS NOT NULL " + where +
                     " GROUP BY rl.respuesta_id";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        Map<Long, Double> mapa = new HashMap<Long, Double>();
        for (Map<String, Object> r : rows) {
            if (r.get("score_5") != null) {
                mapa.put(((Number) r.get("respuesta_id")).longValue(), ((Number) r.get("score_5")).doubleValue());
            }
        }
        return mapa;
    }

    private Map<String, Object> construirMapaPreparacionLikert(String where, List<Object> params) {
        String sql = "SELECT rl.pregunta_codigo, o.puntaje, COUNT(*) AS freq " +
                     "FROM public.respuesta_likert rl " +
                     "JOIN public.opcion o ON o.id = rl.opcion_id " +
                     "JOIN public.respuesta r ON r.id = rl.respuesta_id " +
                     "JOIN public.empleador e ON e.id = r.id " +
                     "WHERE r.tipo = 'empleador' " +
                     "AND rl.pregunta_codigo IN ('EMP_LIKERT_08', 'EMP_LIKERT_02', 'EMP_LIKERT_05', 'EMP_LIKERT_06', 'EMP_LIKERT_09') " +
                     where +
                     " GROUP BY rl.pregunta_codigo, o.puntaje";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        Map<String, long[]> conteos = new HashMap<String, long[]>(); // [0:desacuerdo(1), 1:parcial(3), 2:total(5), 3:noObservado]

        for (String cod : ITEMS_LIKERT_COMPETENCIAS) {
            conteos.put(cod, new long[4]);
        }

        for (Map<String, Object> r : rows) {
            String cod = String.valueOf(r.get("pregunta_codigo"));
            long freq = ((Number) r.get("freq")).longValue();
            Object ptsObj = r.get("puntaje");
            long[] arr = conteos.get(cod);
            if (arr == null) {
                continue;
            }

            if (ptsObj == null) {
                arr[3] += freq;
            } else {
                int pts = ((Number) ptsObj).intValue();
                if (pts == 1) {
                    arr[0] += freq;
                } else if (pts == 2) {
                    arr[1] += freq;
                } else if (pts == 3) {
                    arr[2] += freq;
                }
            }
        }

        List<Map<String, Object>> filas = new ArrayList<Map<String, Object>>();
        long nMax = 0L;

        for (String cod : ITEMS_LIKERT_COMPETENCIAS) {
            long[] a = conteos.get(cod);
            long total = a[0] + a[1] + a[2] + a[3];
            long validas = a[0] + a[1] + a[2];
            if (total > nMax) {
                nMax = total;
            }

            double media = validas > 0 ? ((a[0] * 1.0) + (a[1] * 3.0) + (a[2] * 5.0)) / validas : 0.0;
            double var = 0.0;
            if (validas > 1) {
                double sumSq = a[0] * Math.pow(1.0 - media, 2) +
                               a[1] * Math.pow(3.0 - media, 2) +
                               a[2] * Math.pow(5.0 - media, 2);
                var = sumSq / (validas - 1);
            }

            Map<String, Object> fila = new LinkedHashMap<String, Object>();
            fila.put("codigo", cod);
            fila.put("competencia", ETIQUETAS_LIKERT_COMP.get(cod));
            fila.put("nivel1Desacuerdo", a[0]);
            fila.put("nivel3Parcial", a[1]);
            fila.put("nivel5TotalAcuerdo", a[2]);
            fila.put("noObservado", a[3]);
            fila.put("total", total);
            fila.put("validas", validas);
            fila.put("media", Math.round(media * 100.0) / 100.0);
            fila.put("de", Math.round(Math.sqrt(var) * 100.0) / 100.0);
            filas.add(fila);
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("n", nMax);
        res.put("filas", filas);
        return res;
    }

    private Map<String, Object> extraerTerminosFrecuentesRaw(List<Map<String, Object>> filasEmp) {
        Map<String, Long> areasFreq = new HashMap<String, Long>();
        Map<String, Long> herramientasFreq = new HashMap<String, Long>();
        Map<String, Long> habilidadesFreq = new HashMap<String, Long>();

        for (Map<String, Object> emp : filasEmp) {
            acumularTokens(emp.get("areas_emergentes"), areasFreq);
            acumularTokens(emp.get("herramientas"), herramientasFreq);
            acumularTokens(emp.get("habilidades"), habilidadesFreq);
        }

        Map<String, Object> res = new LinkedHashMap<String, Object>();
        res.put("areasEmergentes", topN(areasFreq, 10));
        res.put("herramientas", topN(herramientasFreq, 10));
        res.put("habilidades", topN(habilidadesFreq, 10));
        return res;
    }

    private void acumularTokens(Object rawObj, Map<String, Long> mapa) {
        if (rawObj == null) {
            return;
        }
        String s = String.valueOf(rawObj).trim();
        if (s.isEmpty()) {
            return;
        }

        String[] partes = s.split("[,;\\n]+");
        for (String p : partes) {
            String limpio = p.trim();
            if (limpio.length() >= 2 && limpio.length() <= 60) {
                String clave = limpio.substring(0, 1).toUpperCase(Locale.ROOT) + limpio.substring(1);
                mapa.merge(clave, 1L, Long::sum);
            }
        }
    }

    private List<Map<String, Object>> topN(Map<String, Long> mapa, int limite) {
        List<Map.Entry<String, Long>> entradas = new ArrayList<Map.Entry<String, Long>>(mapa.entrySet());
        entradas.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));

        List<Map<String, Object>> lista = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < Math.min(limite, entradas.size()); i++) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("termino", entradas.get(i).getKey());
            item.put("frecuencia", entradas.get(i).getValue());
            lista.add(item);
        }
        return lista;
    }

    private String normalizarSinAcentos(String s) {
        String nfd = Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
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

    private static Map<String, Pattern> crearPatronesHardSkills() {
        Map<String, Pattern> m = new LinkedHashMap<String, Pattern>();
        m.put("Inteligencia Artificial / IA", Pattern.compile("\\b(?:ia|inteligencia artificial|inteligente artificial|ml|machine learning|agentes|agentica)\\b"));
        m.put("Desarrollo de Software / Web / Móvil", Pattern.compile("\\b(?:desarrollo|software|web|movil|apps|kotlin|java|python|react|angular|spring|laravel)\\b"));
        m.put("Ciberseguridad", Pattern.compile("\\b(?:ciberseguridad|seguridad informatica|seguridad de la informacion)\\b"));
        m.put("DevOps / Automatización / CI-CD", Pattern.compile("\\b(?:devops|automatizacion|docker|kubernetes|git|github|ci/cd)\\b"));
        m.put("Cloud Computing / Nube", Pattern.compile("\\b(?:cloud|nube|aws|azure|gcp)\\b"));
        m.put("Bases de Datos y Análisis de Datos / BI", Pattern.compile("\\b(?:bases? de datos|sql|analisis de datos|big data|power bi|bi|ciencia de datos)\\b"));
        m.put("Redes e Infraestructura TI", Pattern.compile("\\b(?:redes|infraestructura|servidores|telecomunicaciones)\\b"));
        m.put("Gestión Ágil / QA / Pruebas", Pattern.compile("\\b(?:agil|scrum|jira|trello|qa|pruebas|testing|calidad)\\b"));
        m.put("Arquitectura de Software", Pattern.compile("\\b(?:arquitectura)\\b"));
        return Collections.unmodifiableMap(m);
    }

    private static Map<String, Pattern> crearPatronesSoftSkills() {
        Map<String, Pattern> m = new LinkedHashMap<String, Pattern>();
        m.put("Trabajo en equipo y colaboración", Pattern.compile("\\b(?:trabajo en equipo|colaboracion|multidisciplinario)\\b"));
        m.put("Comunicación efectiva", Pattern.compile("\\b(?:comunicacion|expresion|presentacion)\\b"));
        m.put("Aprendizaje continuo y adaptabilidad", Pattern.compile("\\b(?:aprendizaje|aprender|actualizacion|adaptabilidad|predisposicion)\\b"));
        m.put("Resolución de problemas y pensamiento crítico", Pattern.compile("\\b(?:resolucion de problemas|analisis de problemas|pensamiento critico|criterio tecnico)\\b"));
        m.put("Proactividad e iniciativa", Pattern.compile("\\b(?:proactividad|iniciativa|liderazgo|autonomia)\\b"));
        m.put("Visión de negocio / Orientación al cliente", Pattern.compile("\\b(?:vision de negocio|negocio|cliente|ventas)\\b"));
        m.put("Responsabilidad y ética profesional", Pattern.compile("\\b(?:responsabilidad|etica|compromiso|atencion al detalle)\\b"));
        m.put("Idioma Inglés", Pattern.compile("\\b(?:ingles|english)\\b"));
        return Collections.unmodifiableMap(m);
    }
}