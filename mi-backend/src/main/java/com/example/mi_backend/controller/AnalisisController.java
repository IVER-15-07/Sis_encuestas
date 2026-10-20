package com.example.mi_backend.controller;

import com.example.mi_backend.dto.ChiCuadradoResultDTO;
import com.example.mi_backend.service.AnalisisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/api/analisis")
public class AnalisisController {

    private final AnalisisService analisisService;

    public AnalisisController(AnalisisService analisisService) {
        this.analisisService = analisisService;
    }

    @PostMapping("/chi-cuadrado")
    public ResponseEntity<?> calcularChi(
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            @RequestParam("variableFila") String variableFila,
            @RequestParam("variableColumna") String variableColumna) {
        try {
            ChiCuadradoResultDTO resultado = analisisService.calcularChiCuadrado(variableFila, variableColumna);
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/exportar/titulados-csv")
    public ResponseEntity<byte[]> exportarTituladosCsv() {
        List<Map<String, Object>> filas = jdbcTemplate.queryForList("SELECT * FROM v_titulados_plano");

        StringBuilder csv = new StringBuilder();
        if (!filas.isEmpty()) {
            // Encabezados
            csv.append(String.join(",", filas.get(0).keySet())).append("\n");
            // Filas
            for (Map<String, Object> fila : filas) {
                String linea = fila.values().stream()
                        .map(v -> v == null ? "" : "\"" + v.toString().replace("\"", "\"\"") + "\"")
                        .collect(Collectors.joining(","));
                csv.append(linea).append("\n");
            }
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=datos_titulados.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}