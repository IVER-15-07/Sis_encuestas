package com.example.mi_backend.controller;

import com.example.mi_backend.dto.ChiCuadradoResultDTO;
import com.example.mi_backend.service.AnalisisService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class AnalisisController {

    private final AnalisisService analisisService;
    private final JdbcTemplate jdbcTemplate;

    public AnalisisController(AnalisisService analisisService, JdbcTemplate jdbcTemplate) {
        this.analisisService = analisisService;
        this.jdbcTemplate = jdbcTemplate;
    }

    // 1. Obtener la lista de archivos previamente cargados
    @GetMapping("/importaciones/historial")
    public ResponseEntity<List<Map<String, Object>>> listarHistorialArchivos(
            @RequestParam(value = "tipo", defaultValue = "titulados") String tipo) {
        String sql = "SELECT id, nombre_archivo, filas_cargadas, creado_en FROM importacion WHERE tipo_encuesta = ? ORDER BY creado_en DESC";
        List<Map<String, Object>> archivos = jdbcTemplate.queryForList(sql, tipo);
        return ResponseEntity.ok(archivos);
    }

    // 2. Cálculo de Chi-cuadrado filtrando opcionalmente por un archivo en
    // específico
    @PostMapping("/analisis/chi-cuadrado")
    public ResponseEntity<?> calcularChi(
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {
        try {
            ChiCuadradoResultDTO resultado = analisisService.calcularChiCuadrado(variableFila, variableColumna,
                    importacionId);
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 3. Exportar los datos guardados en formato CSV
    @GetMapping("/exportar/titulados-csv")
    public ResponseEntity<byte[]> exportarTituladosCsv(
            @RequestParam(value = "importacionId", required = false) Long importacionId) {

        StringBuilder sql = new StringBuilder("SELECT t.* FROM v_titulados_plano t ");
        if (importacionId != null && importacionId > 0) {
            sql.append("JOIN respuesta r ON r.id = t.id WHERE r.importacion_id = ").append(importacionId);
        }

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString());

        StringBuilder csv = new StringBuilder();
        if (!filas.isEmpty()) {
            csv.append(String.join(",", filas.get(0).keySet())).append("\n");
            for (Map<String, Object> fila : filas) {
                String linea = fila.values().stream()
                        .map(v -> v == null ? "" : "\"" + v.toString().replace("\"", "\"\"") + "\"")
                        .collect(Collectors.joining(","));
                csv.append(linea).append("\n");
            }
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=datos_titulados_supabase.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    @GetMapping("/exportar/matriz-cruzada-csv")
    public ResponseEntity<byte[]> exportarMatrizCruzadaCsv(
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna,
            @RequestParam(value = "importacionId", required = false) Long importacionId) {

        ChiCuadradoResultDTO dto = analisisService.calcularChiCuadrado(variableFila, variableColumna, importacionId);

        StringBuilder csv = new StringBuilder();

        // Encabezado
        csv.append("\"").append(variableFila).append(" / ").append(variableColumna).append("\",");
        csv.append(dto.getCategoriasColumna().stream().map(c -> "\"" + c + "\"").collect(Collectors.joining(",")));
        csv.append(",\"Total Fila\"\n");

        // Filas con valores y totales
        long[] totalesColumna = new long[dto.getCategoriasColumna().size()];
        long granTotal = 0;

        for (int i = 0; i < dto.getCategoriasFila().size(); i++) {
            csv.append("\"").append(dto.getCategoriasFila().get(i)).append("\",");
            long sumaFila = 0;
            for (int j = 0; j < dto.getCategoriasColumna().size(); j++) {
                long val = dto.getObservados()[i][j];
                csv.append(val).append(",");
                sumaFila += val;
                totalesColumna[j] += val;
            }
            csv.append(sumaFila).append("\n");
            granTotal += sumaFila;
        }

        // Fila final de totales por columna
        csv.append("\"Total Columna\",");
        for (long tc : totalesColumna) {
            csv.append(tc).append(",");
        }
        csv.append(granTotal).append("\n");

        // Metadatos de Chi-cuadrado para el informe
        csv.append("\n\"--- METADATOS ESTADISTICOS ARCUSUR ---\"\n");
        csv.append("\"Chi-cuadrado (Chi^2)\",").append(dto.getChiCuadrado()).append("\n");
        csv.append("\"Grados de Libertad (gl)\",").append(dto.getGradosLibertad()).append("\n");
        csv.append("\"p-valor\",").append(dto.getPValor()).append("\n");

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=matriz_cruzada_" + variableFila + "_" + variableColumna + ".csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}