package com.example.mi_backend.service;

import com.example.mi_backend.model.Importacion;
import com.example.mi_backend.repository.ImportacionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ImportacionService {

    private final ImportacionRepository importacionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DataFormatter dataFormatter = new DataFormatter();

    private static final Set<String> BASURA = Set.of("-", ".", "n/a", "na", "prefiero no responder", "ninguno", "null");
    private static final Pattern NUM_PATTERN = Pattern.compile("(\\d+(?:[.,]\\d+)?)");
    private static final int TAMANO_LOTE = 250;

    public ImportacionService(ImportacionRepository importacionRepository, JdbcTemplate jdbcTemplate) {
        this.importacionRepository = importacionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    private void ejecutarLote(String sql, List<Object[]> filas) {
        if (filas.isEmpty()) return;
        jdbcTemplate.batchUpdate(sql, filas);
        filas.clear();
    }

    // Caché en memoria del catálogo opcion: clave "PREGUNTA_CODIGO|valor_normalizado" -> opcion.id
    private Map<String, Long> cargarMapaOpciones() {
        Map<String, Long> mapa = new HashMap<>();
        jdbcTemplate.query("SELECT id, pregunta_codigo, valor FROM public.opcion", rs -> {
            String key = rs.getString("pregunta_codigo") + "|" + normalizarClave(rs.getString("valor"));
            mapa.put(key, rs.getLong("id"));
        });
        return mapa;
    }

    private String normalizarClave(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String obtenerDimensionPregunta(String codigo, String encuesta) {
        if ("empleadores".equals(encuesta)) {
            if ("EMP_MULT_CARGOS".equals(codigo)) return "Demanda";
            if (Set.of("01", "02", "04", "05", "06", "08", "09", "17")
                    .contains(codigo.substring(codigo.length() - 2))) {
                return "Desempeno_Perfil";
            }
            return "Vinculacion";
        }
        if (codigo.contains("POSGRADO")) return "Posgrado";
        if (codigo.contains("NEGOCIO") || codigo.contains("IMPORTANCIA_FORMACION_NEG")) return "Emprendimiento";
        if (codigo.contains("ASPECTOS") || codigo.contains("ASIG")) return "Evaluacion_Curricular";
        if (codigo.contains("SATISFACCION_GLOBAL") || codigo.contains("CONCORDANCIA")) return "Satisfaccion";
        return "Laboral";
    }

    private void asegurarPregunta(String codigo, String encuesta, String tipo) {
        String etiqueta = codigo.replaceFirst("^(TIT|EMP)_(LIKERT|MULT)_", "").replace('_', ' ');
        jdbcTemplate.update(
            "INSERT INTO public.pregunta (codigo, encuesta, dimension, etiqueta_corta, texto_forms, tipo) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (codigo) DO NOTHING",
            codigo, encuesta, obtenerDimensionPregunta(codigo, encuesta), etiqueta, etiqueta, tipo
        );
    }

    @Transactional
    public Importacion importarTitulados(MultipartFile file) throws Exception {
        Importacion imp = new Importacion();
        imp.setTipoEncuesta("titulados");
        imp.setNombreArchivo(file.getOriginalFilename());
        imp = importacionRepository.save(imp);

        for (String codigo : List.of(
                "TIT_LIKERT_POSGRADO_AFIN",
                "TIT_LIKERT_PERTINENCIA_PUESTO",
                "TIT_LIKERT_SATISFACCION_NEGOCIO",
                "TIT_LIKERT_IMPORTANCIA_FORMACION_NEG",
                "TIT_LIKERT_SATISFACCION_GLOBAL",
                "TIT_LIKERT_CONCORDANCIA_MERCADO")) {
            asegurarPregunta(codigo, "titulados", "likert");
        }
        for (String codigo : List.of(
                "TIT_MULT_AREA_ORG",
                "TIT_MULT_ASPECTOS_UTILES",
                "TIT_MULT_ASPECTOS_MEJORAR",
                "TIT_MULT_ASIG_VENTAJA",
                "TIT_MULT_ASIG_NO_UTIL")) {
            asegurarPregunta(codigo, "titulados", "multiple");
        }

        Map<String, Long> opcionesMap = cargarMapaOpciones();
        int leidas = 0, cargadas = 0;
        List<Object[]> titulados = new ArrayList<>();
        List<Object[]> contactos = new ArrayList<>();
        List<Object[]> formaciones = new ArrayList<>();
        List<Object[]> situaciones = new ArrayList<>();
        List<Object[]> empleos = new ArrayList<>();
        List<Object[]> emprendimientos = new ArrayList<>();
        List<Object[]> respuestasLikert = new ArrayList<>();
        List<Object[]> respuestasMultiple = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;
                leidas++;

                Integer idForms = getInt(row.getCell(0));
                Timestamp fechaInicio = getTimestamp(row.getCell(1));
                Timestamp fechaEnvio = getTimestamp(row.getCell(2));

                Long respId = jdbcTemplate.queryForObject(
                    "INSERT INTO public.respuesta (importacion_id, tipo, id_forms, fecha_inicio, fecha_envio) VALUES (?, 'titulado', ?, ?, ?) RETURNING id",
                    Long.class, imp.getId(), idForms, fechaInicio, fechaEnvio
                );

                // 1. Titulado
                String edad = getCleanString(row.getCell(4));
                String genero = getCleanString(row.getCell(5));
                Boolean aceptaRed = parseSiNo(getCleanString(row.getCell(49)));
                titulados.add(new Object[]{ respId, edad, genero, aceptaRed });

                // 2. Contacto
                String email = getCleanString(row.getCell(50));
                String telefono = getCleanString(row.getCell(51));
                String linkedin = getCleanString(row.getCell(52));
                if (email != null || telefono != null || linkedin != null) {
                    contactos.add(new Object[]{ respId, email, telefono, linkedin });
                }

                // 3. Formación Posgrado
                Boolean tienePosgrado = parseSiNo(getCleanString(row.getCell(6)));
                String nivelPos = getCleanString(row.getCell(7));
                String lugarPos = getCleanString(row.getCell(8));
                String financPos = getCleanString(row.getCell(9));
                String nombreProg = getCleanString(row.getCell(10));
                Boolean interesadoPos = parseSiNo(getCleanString(row.getCell(11)));
                String areaInteres = getCleanString(row.getCell(12));
                String orgPreferida = getCleanString(row.getCell(13));
                formaciones.add(new Object[]{ respId, tienePosgrado, nivelPos, lugarPos, financPos, nombreProg, interesadoPos, areaInteres, orgPreferida });

                // 4. Situación Laboral
                BigDecimal aniosProf = parseAnios(getRawString(row.getCell(15)));
                BigDecimal aniosDesemp = parseAnios(getRawString(row.getCell(16)));
                String situacion = getCleanString(row.getCell(17));
                Boolean primerEmpleo = parseSiNo(getCleanString(row.getCell(36)));
                String razonNoTrabaja = getCleanString(row.getCell(37));
                Boolean tuvoTrabajoAntes = parseSiNo(getCleanString(row.getCell(38)));
                String tiempoPrimerTrab = getCleanString(row.getCell(39));
                String numEmpleos = getCleanString(row.getCell(40));
                situaciones.add(new Object[]{ respId, aniosProf, aniosDesemp, situacion, primerEmpleo, tiempoPrimerTrab, numEmpleos, tuvoTrabajoAntes, razonNoTrabaja });

                // 5. Empleo Actual (solo si tiene datos laborales en organización)
                String empresa = getCleanString(row.getCell(18));
                String rubro = getCleanString(row.getCell(19));
                String rubroOtro = getCleanString(row.getCell(20));
                String sector = getCleanString(row.getCell(21));
                String depto = getCleanString(row.getCell(22));
                String areaOtro = getCleanString(row.getCell(24));
                String cargo = getCleanString(row.getCell(25));
                String cargoOtro = getCleanString(row.getCell(26));
                String antiguedad = getCleanString(row.getCell(28));
                String medioObtencion = getCleanString(row.getCell(29));
                String remuneracion = getCleanString(row.getCell(30));
                if (situacion != null && situacion.toLowerCase().contains("organización") || rubro != null || sector != null) {
                    empleos.add(new Object[]{ respId, empresa, rubro, rubroOtro, sector, depto, cargo, cargoOtro, areaOtro, antiguedad, medioObtencion, remuneracion });
                }

                // 6. Emprendimiento
                String origenEmp = getCleanString(row.getCell(31));
                String entregable = getCleanString(row.getCell(32));
                String financExt = getCleanString(row.getCell(33));
                if (origenEmp != null || entregable != null || financExt != null) {
                    emprendimientos.add(new Object[]{ respId, origenEmp, entregable, financExt });
                }

                // 7. Escalas Likert (6 preguntas de titulados)
                insertarLikert(respId, "TIT_LIKERT_POSGRADO_AFIN", getCleanString(row.getCell(14)), opcionesMap, respuestasLikert);
                insertarLikert(respId, "TIT_LIKERT_PERTINENCIA_PUESTO", getCleanString(row.getCell(27)), opcionesMap, respuestasLikert);
                insertarLikert(respId, "TIT_LIKERT_SATISFACCION_NEGOCIO", getCleanString(row.getCell(34)), opcionesMap, respuestasLikert);
                insertarLikert(respId, "TIT_LIKERT_IMPORTANCIA_FORMACION_NEG", getCleanString(row.getCell(35)), opcionesMap, respuestasLikert);
                insertarLikert(respId, "TIT_LIKERT_SATISFACCION_GLOBAL", getCleanString(row.getCell(41)), opcionesMap, respuestasLikert);
                insertarLikert(respId, "TIT_LIKERT_CONCORDANCIA_MERCADO", getCleanString(row.getCell(42)), opcionesMap, respuestasLikert);

                // 8. Selección múltiple
                insertarMultipleTitulado(respId, "TIT_MULT_AREA_ORG", getRawString(row.getCell(23)), null, opcionesMap, respuestasMultiple);
                insertarMultipleTitulado(respId, "TIT_MULT_ASPECTOS_UTILES", getRawString(row.getCell(43)), null, opcionesMap, respuestasMultiple);
                insertarMultipleTitulado(respId, "TIT_MULT_ASPECTOS_MEJORAR", getRawString(row.getCell(44)), null, opcionesMap, respuestasMultiple);
                insertarMultipleTitulado(respId, "TIT_MULT_ASIG_VENTAJA", getRawString(row.getCell(45)), getCleanString(row.getCell(46)), opcionesMap, respuestasMultiple);
                insertarMultipleTitulado(respId, "TIT_MULT_ASIG_NO_UTIL", getRawString(row.getCell(47)), getCleanString(row.getCell(48)), opcionesMap, respuestasMultiple);

                cargadas++;
                if (leidas % TAMANO_LOTE == 0) {
                    guardarLotesTitulados(titulados, contactos, formaciones, situaciones, empleos, emprendimientos, respuestasLikert, respuestasMultiple);
                }
            }
        }

        guardarLotesTitulados(titulados, contactos, formaciones, situaciones, empleos, emprendimientos, respuestasLikert, respuestasMultiple);
        imp.setFilasLeidas(leidas);
        imp.setFilasCargadas(cargadas);
        imp.setFilasRechazadas(leidas - cargadas);
        return importacionRepository.save(imp);
    }

    private void guardarLotesTitulados(
            List<Object[]> titulados,
            List<Object[]> contactos,
            List<Object[]> formaciones,
            List<Object[]> situaciones,
            List<Object[]> empleos,
            List<Object[]> emprendimientos,
            List<Object[]> respuestasLikert,
            List<Object[]> respuestasMultiple) {
        ejecutarLote("INSERT INTO public.titulado (id, edad_rango, genero, acepta_red) VALUES (?, ?, ?, ?)", titulados);
        ejecutarLote("INSERT INTO public.titulado_contacto (titulado_id, email, telefono, linkedin) VALUES (?, ?, ?, ?)", contactos);
        ejecutarLote("INSERT INTO public.formacion_posgrado (titulado_id, tiene_formacion, nivel, lugar, financiamiento, nombre_programa, interesado, area_interes, organizacion_preferida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", formaciones);
        ejecutarLote("INSERT INTO public.situacion_laboral (titulado_id, anios_vida_profesional, anios_desempleado, situacion, primer_empleo, tiempo_primer_trabajo, num_empleos, tuvo_trabajo_antes, razon_no_trabaja) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", situaciones);
        ejecutarLote("INSERT INTO public.empleo_actual (titulado_id, organizacion, rubro, rubro_otro, sector, departamento, cargo, cargo_otro, area_otro, antiguedad, medio_obtencion, remuneracion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", empleos);
        ejecutarLote("INSERT INTO public.emprendimiento (titulado_id, origen, entregable, financiamiento_externo) VALUES (?, ?, ?, ?)", emprendimientos);
        ejecutarLote("INSERT INTO public.respuesta_likert (respuesta_id, pregunta_codigo, opcion_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", respuestasLikert);
        ejecutarLote("INSERT INTO public.respuesta_multiple (respuesta_id, pregunta_codigo, opcion_id, otro_texto) VALUES (?, ?, ?, ?)", respuestasMultiple);
    }

    @Transactional
    public Importacion importarEmpleadores(MultipartFile file) throws Exception {
        Importacion imp = new Importacion();
        imp.setTipoEncuesta("empleadores");
        imp.setNombreArchivo(file.getOriginalFilename());
        imp = importacionRepository.save(imp);

        asegurarPregunta("EMP_MULT_CARGOS", "empleadores", "multiple");
        for (int i = 1; i <= 18; i++) {
            asegurarPregunta(String.format(Locale.ROOT, "EMP_LIKERT_%02d", i), "empleadores", "likert");
        }

        Map<String, Long> opcionesMap = cargarMapaOpciones();
        int leidas = 0, cargadas = 0;
        List<Object[]> empleadores = new ArrayList<>();
        List<Object[]> respuestasLikert = new ArrayList<>();
        List<Object[]> respuestasMultiple = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;
                leidas++;

                Timestamp fechaEnvio = getTimestamp(row.getCell(0));
                Long respId = jdbcTemplate.queryForObject(
                    "INSERT INTO public.respuesta (importacion_id, tipo, fecha_envio) VALUES (?, 'empleador', ?) RETURNING id",
                    Long.class, imp.getId(), fechaEnvio
                );

                String correo = getCleanString(row.getCell(1));
                String org = getCleanString(row.getCell(2));
                String tipoOrg = getCleanString(row.getCell(3));
                String tamano = getCleanString(row.getCell(4));
                String rubro = getCleanString(row.getCell(5));
                Boolean contrato5 = parseSiNo(getCleanString(row.getCell(6)));
                String probContratacion = getCleanString(row.getCell(7));
                String nivelDemandado = getCleanString(row.getCell(8));
                String medioConvocatoria = getCleanString(row.getCell(9));
                String areasEmergentes = getCleanString(row.getCell(11));
                String herramientas = getCleanString(row.getCell(12));
                String habilidades = getCleanString(row.getCell(13));

                empleadores.add(new Object[]{ respId, correo, org, tipoOrg, tamano, rubro, contrato5, probContratacion, nivelDemandado, medioConvocatoria, areasEmergentes, herramientas, habilidades });

                // Col 10: Cargos (separado por comas fuera de paréntesis)
                String rawCargos = getRawString(row.getCell(10));
                if (rawCargos != null && !rawCargos.isBlank()) {
                    String[] partes = rawCargos.split(",\\s*(?![^()]*\\))");
                    for (String p : partes) {
                        String val = p.trim();
                        if (val.isEmpty()) continue;
                        Long opcId = opcionesMap.get("EMP_MULT_CARGOS|" + normalizarClave(val));
                        respuestasMultiple.add(new Object[]{ respId, "EMP_MULT_CARGOS", opcId, opcId == null ? val : null });
                    }
                }

                // Cols 14..31: Las 18 preguntas Likert de Empleadores
                for (int i = 0; i < 18; i++) {
                    String codigo = String.format("EMP_LIKERT_%02d", i + 1);
                    String val = getCleanString(row.getCell(14 + i));
                    insertarLikert(respId, codigo, val, opcionesMap, respuestasLikert);
                }

                cargadas++;
                if (leidas % TAMANO_LOTE == 0) {
                    guardarLotesEmpleadores(empleadores, respuestasLikert, respuestasMultiple);
                }
            }
        }

        guardarLotesEmpleadores(empleadores, respuestasLikert, respuestasMultiple);
        imp.setFilasLeidas(leidas);
        imp.setFilasCargadas(cargadas);
        imp.setFilasRechazadas(leidas - cargadas);
        return importacionRepository.save(imp);
    }

    private void guardarLotesEmpleadores(List<Object[]> empleadores, List<Object[]> respuestasLikert, List<Object[]> respuestasMultiple) {
        ejecutarLote("INSERT INTO public.empleador (id, correo, organizacion, tipo_organizacion, tamano, rubro, contrato_ultimos_5, prob_contratacion, nivel_formacion_demandado, medio_convocatoria, areas_emergentes, herramientas, habilidades) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", empleadores);
        ejecutarLote("INSERT INTO public.respuesta_likert (respuesta_id, pregunta_codigo, opcion_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", respuestasLikert);
        ejecutarLote("INSERT INTO public.respuesta_multiple (respuesta_id, pregunta_codigo, opcion_id, otro_texto) VALUES (?, ?, ?, ?)", respuestasMultiple);
    }

    private void insertarLikert(Long respId, String preguntaCodigo, String valor, Map<String, Long> opcionesMap, List<Object[]> respuestas) {
        if (valor == null) return;
        Long opcId = opcionesMap.get(preguntaCodigo + "|" + normalizarClave(valor));
        if (opcId == null) {
            // Si llega una categoría nueva en futuros Excel, la registra automáticamente
            opcId = jdbcTemplate.queryForObject(
                "INSERT INTO public.opcion (pregunta_codigo, valor, orden) VALUES (?, ?, 99) ON CONFLICT (pregunta_codigo, valor) DO UPDATE SET valor = EXCLUDED.valor RETURNING id",
                Long.class, preguntaCodigo, valor
            );
            opcionesMap.put(preguntaCodigo + "|" + normalizarClave(valor), opcId);
        }
        respuestas.add(new Object[]{ respId, preguntaCodigo, opcId });
    }

    private void insertarMultipleTitulado(Long respId, String preguntaCodigo, String rawVal, String otroTexto, Map<String, Long> opcionesMap, List<Object[]> respuestas) {
        List<String> items = new ArrayList<>();
        if (rawVal != null && !rawVal.isBlank()) {
            String s = rawVal.trim();
            if (s.startsWith("[")) {
                try {
                    items.addAll(objectMapper.readValue(s, new TypeReference<List<String>>() {}));
                } catch (Exception ignored) {}
            } else {
                items.addAll(Arrays.asList(s.split(";")));
            }
        }
        for (String item : items) {
            String val = item.trim();
            if (val.isEmpty() || BASURA.contains(val.toLowerCase(Locale.ROOT))) continue;
            Long opcId = opcionesMap.get(preguntaCodigo + "|" + normalizarClave(val));
            if (opcId == null) {
                opcId = jdbcTemplate.queryForObject(
                    "INSERT INTO public.opcion (pregunta_codigo, valor, orden) VALUES (?, ?, 99) ON CONFLICT (pregunta_codigo, valor) DO UPDATE SET valor = EXCLUDED.valor RETURNING id",
                    Long.class, preguntaCodigo, val
                );
                opcionesMap.put(preguntaCodigo + "|" + normalizarClave(val), opcId);
            }
            respuestas.add(new Object[]{ respId, preguntaCodigo, opcId, null });
        }
        if (otroTexto != null) {
            respuestas.add(new Object[]{ respId, preguntaCodigo, null, otroTexto });
        }
    }

    private BigDecimal parseAnios(String raw) {
        if (raw == null) return null;
        String s = raw.trim().toLowerCase(Locale.ROOT);
        if (s.isEmpty() || s.contains("nada") || s.contains("ningun") || s.contains("siempre estuve")) {
            return BigDecimal.ZERO;
        }
        Matcher m = NUM_PATTERN.matcher(s);
        if (!m.find()) return null;
        double val = Double.parseDouble(m.group(1).replace(",", "."));
        if (s.contains("mes")) {
            val = val / 12.0;
        }
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP);
    }

    private Boolean parseSiNo(String val) {
        if (val == null) return null;
        String s = val.trim().toLowerCase(Locale.ROOT);
        if (s.equals("si") || s.equals("sí") || s.equals("true")) return true;
        if (s.equals("no") || s.equals("false")) return false;
        return null;
    }

    private String getRawString(Cell cell) {
        if (cell == null) return null;
        String v = dataFormatter.formatCellValue(cell);
        return v == null ? null : v.trim();
    }

    private String getCleanString(Cell cell) {
        String v = getRawString(cell);
        if (v == null || v.isEmpty()) return null;
        if (BASURA.contains(v.toLowerCase(Locale.ROOT))) return null;
        return v;
    }

    private Integer getInt(Cell cell) {
        String v = getRawString(cell);
        if (v == null) return null;
        try { return (int) Double.parseDouble(v); } catch (Exception e) { return null; }
    }

    private Timestamp getTimestamp(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            LocalDateTime ldt = cell.getLocalDateTimeCellValue();
            return Timestamp.valueOf(ldt);
        }
        return null;
    }

    private boolean isRowEmpty(Row row) {
        for (int c = 0; c < 6; c++) {
            String v = getRawString(row.getCell(c));
            if (v != null && !v.isEmpty()) return false;
        }
        return true;
    }
}