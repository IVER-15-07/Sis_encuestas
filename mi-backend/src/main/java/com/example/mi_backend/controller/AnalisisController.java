package com.example.mi_backend.controller;

import com.example.mi_backend.dto.EmpleadoresFiltroDTO;
import com.example.mi_backend.dto.TituladosFiltroDTO;
import com.example.mi_backend.service.AnalisisService;
import com.example.mi_backend.service.BrechasCompetenciasService;
import com.example.mi_backend.service.CrucesYSimulacionService;
import com.example.mi_backend.service.FormacionYFinanciamientoService;
import com.example.mi_backend.service.PerfilEmpleabilidadService;
import com.example.mi_backend.service.EmpleadoresValoracionService;
import com.example.mi_backend.service.EmpleadoresBrechasService;
import com.example.mi_backend.service.EmpleadoresCrucesService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class AnalisisController {

    private final AnalisisService analisisService;
    private final JdbcTemplate jdbcTemplate;
    private final PerfilEmpleabilidadService perfilEmpleabilidadService;
    private final FormacionYFinanciamientoService formacionYFinanciamientoService;
    private final BrechasCompetenciasService brechasCompetenciasService;
    private final CrucesYSimulacionService crucesYSimulacionService;
    private final EmpleadoresValoracionService empleadoresValoracionService;
    private final EmpleadoresBrechasService empleadoresBrechasService;
    private final EmpleadoresCrucesService empleadoresCrucesService;
    public AnalisisController(AnalisisService analisisService, JdbcTemplate jdbcTemplate,
            PerfilEmpleabilidadService perfilEmpleabilidadService,
            FormacionYFinanciamientoService formacionYFinanciamientoService,
            BrechasCompetenciasService brechasCompetenciasService,
            CrucesYSimulacionService crucesYSimulacionService,
            EmpleadoresValoracionService empleadoresValoracionService,
            EmpleadoresBrechasService empleadoresBrechasService,
            EmpleadoresCrucesService empleadoresCrucesService) {
        this.analisisService = analisisService;
        this.jdbcTemplate = jdbcTemplate;
        this.perfilEmpleabilidadService = perfilEmpleabilidadService;
        this.formacionYFinanciamientoService = formacionYFinanciamientoService;
        this.brechasCompetenciasService = brechasCompetenciasService;
        this.crucesYSimulacionService = crucesYSimulacionService;
        this.empleadoresValoracionService = empleadoresValoracionService;
        this.empleadoresBrechasService = empleadoresBrechasService;
        this.empleadoresCrucesService = empleadoresCrucesService;
    }

    // Cuerpo de error seguro: getMessage() puede ser null y Map.of lanzaría NPE
    private Map<String, Object> errorBody(Exception e) {
        Map<String, Object> error = new LinkedHashMap<String, Object>();
        error.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        return error;
    }

    // 1. Historial de archivos cargados
    @GetMapping("/importaciones/historial")
    public ResponseEntity<List<Map<String, Object>>> listarHistorialArchivos(
            @RequestParam(value = "tipo", defaultValue = "titulados") String tipo) {
        return ResponseEntity.ok(jdbcTemplate.queryForList(
                "SELECT id, nombre_archivo, filas_leidas, filas_cargadas, filas_rechazadas, creado_en FROM public.importacion WHERE tipo_encuesta = ? ORDER BY creado_en DESC",
                tipo));
    }

    // 2. Catálogo de preguntas cruzables por encuesta ('titulados' o 'empleadores')
    @GetMapping("/analisis/preguntas")
    public ResponseEntity<List<Map<String, Object>>> listarPreguntas(
            @RequestParam(value = "encuesta", defaultValue = "titulados") String encuesta) {
        return ResponseEntity.ok(analisisService.listarPreguntas(encuesta));
    }

    // 3. Balance estadístico individual (frecuencias, %, promedio Likert)
    @GetMapping("/analisis/balance/{preguntaCodigo}")
    public ResponseEntity<?> balancePregunta(
            @PathVariable String preguntaCodigo,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {
        try {
            return ResponseEntity.ok(analisisService.obtenerBalancePregunta(preguntaCodigo, importacionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorBody(e));
        }
    }

    // 4. Vista: Brechas de competencias y Valoración de Empleadores
    @GetMapping("/analisis/brechas-valoracion")
    public ResponseEntity<?> brechasYValoracion(
            @RequestParam(value = "importacionTitId", required = false) Long importacionTitId,
            @RequestParam(value = "importacionEmpId", required = false) Long importacionEmpId) {
        return ResponseEntity.ok(analisisService.obtenerBrechasYValoracion(importacionTitId, importacionEmpId));
    }

    // 5. Vista: Simulación de escenarios
    @GetMapping("/analisis/simulacion")
    public ResponseEntity<?> simularEscenario(
            @RequestParam(value = "deltaPasantiasPct", defaultValue = "15") double deltaPasantiasPct,
            @RequestParam(value = "deltaPosgradoPct", defaultValue = "10") double deltaPosgradoPct,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {
        return ResponseEntity.ok(analisisService.simularEscenario(deltaPasantiasPct, deltaPosgradoPct, importacionId));
    }

    // 6. Vista: Cruces y Chi-cuadrado (encuesta = 'titulados' o 'empleadores')
    @PostMapping("/analisis/chi-cuadrado")
    public ResponseEntity<?> calcularChi(
            @RequestParam(value = "encuesta", defaultValue = "titulados") String encuesta,
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {
        try {
            return ResponseEntity.ok(
                    analisisService.calcularCruceYChiCuadrado(encuesta, variableFila, variableColumna, importacionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorBody(e));
        }
    }

    // 7. Exportar matriz cruzada + Chi-cuadrado + V de Cramér en CSV
    @GetMapping("/exportar/matriz-cruzada-csv")
    public ResponseEntity<byte[]> exportarMatrizCruzadaCsv(
            @RequestParam(value = "encuesta", defaultValue = "titulados") String encuesta,
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {

        Map<String, Object> dto = analisisService.calcularCruceYChiCuadrado(encuesta, variableFila, variableColumna,
                importacionId);
        @SuppressWarnings("unchecked")
        List<String> catFila = (List<String>) dto.get("categoriasFila");
        @SuppressWarnings("unchecked")
        List<String> catCol = (List<String>) dto.get("categoriasColumna");
        long[][] obs = (long[][]) dto.get("observados");
        long[] totFila = (long[]) dto.get("totalesFila");
        long[] totCol = (long[]) dto.get("totalesColumna");

        StringBuilder csv = new StringBuilder();
        csv.append("\"").append(variableFila).append(" / ").append(variableColumna).append("\",");
        csv.append(catCol.stream().map(c -> "\"" + c + "\"").collect(Collectors.joining(",")));
        csv.append(",\"Total Fila\"\n");

        for (int i = 0; i < catFila.size(); i++) {
            csv.append("\"").append(catFila.get(i)).append("\",");
            for (int j = 0; j < catCol.size(); j++) {
                csv.append(obs[i][j]).append(",");
            }
            csv.append(totFila[i]).append("\n");
        }

        csv.append("\"Total Columna\",");
        for (long tc : totCol) {
            csv.append(tc).append(",");
        }
        csv.append(dto.get("totalN")).append("\n\n");

        csv.append("\"--- METADATOS ESTADISTICOS CEUB / ARCU-SUR ---\"\n");
        csv.append("\"Chi-cuadrado (Chi^2)\",").append(dto.get("chiCuadrado")).append("\n");
        csv.append("\"Grados de Libertad (gl)\",").append(dto.get("gradosLibertad")).append("\n");
        csv.append("\"p-valor\",").append(dto.get("pValor")).append("\n");
        csv.append("\"V de Cramer\",").append(dto.get("vCramer")).append("\n");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cruce_" + encuesta + "_" + variableFila + "_" + variableColumna + ".csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    // 8. Vistas de titulados con filtros (TituladosFiltroDTO)
    @GetMapping("/analisis/titulados/perfil-empleabilidad")
    public ResponseEntity<Map<String, Object>> perfilEmpleabilidad(
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(perfilEmpleabilidadService.obtenerTodoPerfilEmpleabilidad(filtro));
    }

    @GetMapping("/analisis/titulados/perfil-empleabilidad-completo")
    public ResponseEntity<Map<String, Object>> perfilEmpleabilidadCompleto(
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(perfilEmpleabilidadService.obtenerTodoPerfilEmpleabilidad(filtro));
    }

    @GetMapping("/analisis/titulados/formacion-continua")
    public ResponseEntity<Map<String, Object>> formacionContinua(
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(formacionYFinanciamientoService.obtenerFormacionContinua(filtro));
    }

    @GetMapping("/analisis/titulados/formacion-continua-completa")
    public ResponseEntity<Map<String, Object>> formacionContinuaCompleta(
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(formacionYFinanciamientoService.obtenerFormacionContinua(filtro));
    }

    // Financiamiento (distribución + cruce dinámico + Kruskal-Wallis Monte Carlo)
    @GetMapping("/analisis/titulados/financiamiento")
    public ResponseEntity<Map<String, Object>> financiamiento(
            @RequestParam(value = "columna", defaultValue = "nivel") String columna,
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(formacionYFinanciamientoService.obtenerAnalisisFinanciamiento(columna, filtro));
    }

    @GetMapping("/analisis/titulados/brechas-competencias")
    public ResponseEntity<Map<String, Object>> brechasCompetencias(
            @ModelAttribute TituladosFiltroDTO filtro) {
        return ResponseEntity.ok(brechasCompetenciasService.obtenerBrechasCompetencias(filtro));
    }

    // 9. Cruces avanzados y simulación Monte Carlo
    @PostMapping("/analisis/cruce-avanzado")
    public ResponseEntity<Map<String, Object>> cruceAvanzado(
            @RequestParam(value = "encuesta", defaultValue = "titulados") String encuesta,
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @ModelAttribute TituladosFiltroDTO filtro) {
        try {
            return ResponseEntity.ok(
                    crucesYSimulacionService.calcularCruceAvanzado(encuesta, variableFila, variableColumna, filtro));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorBody(e));
        }
    }

    @PostMapping("/analisis/simulacion/monte-carlo")
    public ResponseEntity<Map<String, Object>> simularMonteCarlo(
            @RequestParam("preguntaCodigo") String preguntaCodigo,
            @RequestParam(value = "personasN", defaultValue = "100") int personasN,
            @RequestParam(value = "replicasR", defaultValue = "1000") int replicasR,
            @RequestParam(value = "semilla", defaultValue = "42") long semilla,
            @RequestBody(required = false) Map<String, Double> probabilidadesPersonalizadasPct,
            @ModelAttribute TituladosFiltroDTO filtro) {
        try {
            return ResponseEntity.ok(
                    crucesYSimulacionService.simularMonteCarloTransformadaInversa(
                            preguntaCodigo, personasN, replicasR, semilla, probabilidadesPersonalizadasPct, filtro));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorBody(e));
        }
    }

    // Nuevo endpoint para añadir en AnalisisController.java
    // Nuevo endpoint para añadir en AnalisisController.java
    @GetMapping("/analisis/empleadores/valoracion-carrera")
    public ResponseEntity<Map<String, Object>> valoracionCarreraEmpleadores(
            @ModelAttribute EmpleadoresFiltroDTO filtro) {
        return ResponseEntity.ok(empleadoresValoracionService.obtenerValoracionCarrera(filtro));
    }

    // Nuevo endpoint para añadir en AnalisisController.java
    @GetMapping("/analisis/empleadores/brechas-competencias")
    public ResponseEntity<Map<String, Object>> brechasCompetenciasEmpleadores(
            @ModelAttribute EmpleadoresFiltroDTO filtro) {
        return ResponseEntity.ok(empleadoresBrechasService.obtenerBrechasCompetenciasEmpleadores(filtro));
    }

    // Nuevos endpoints para añadir en AnalisisController.java
    @GetMapping("/analisis/empleadores/variables")
    public ResponseEntity<List<Map<String, Object>>> listarVariablesEmpleadores() {
        return ResponseEntity.ok(empleadoresCrucesService.listarVariablesCruzablesEmpleadores());
    }

    @PostMapping("/analisis/empleadores/cruce")
    public ResponseEntity<Map<String, Object>> cruceEmpleadores(
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @ModelAttribute EmpleadoresFiltroDTO filtro) {
        try {
            Map<String, Object> res = empleadoresCrucesService.calcularCruceEmpleadores(
                variableFila, variableColumna, filtro
            );
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            Map<String, Object> err = new LinkedHashMap<String, Object>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}