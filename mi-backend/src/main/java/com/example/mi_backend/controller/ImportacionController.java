package com.example.mi_backend.controller;

import com.example.mi_backend.model.Importacion;
import com.example.mi_backend.service.ImportacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/importacion")
public class ImportacionController {

    private final ImportacionService importacionService;

    public ImportacionController(ImportacionService importacionService) {
        this.importacionService = importacionService;
    }

    @PostMapping("/titulados")
    public ResponseEntity<?> subirTitulados(@RequestParam("archivo") MultipartFile archivo) {
        try {
            Importacion imp = importacionService.importarTitulados(archivo);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Archivo de titulados importado con éxito",
                    "id", imp.getId(),
                    "cargadas", imp.getFilasCargadas(),
                    "rechazadas", imp.getFilasRechazadas()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/empleadores")
    public ResponseEntity<?> subirEmpleadores(@RequestParam("archivo") MultipartFile archivo) {
        try {
            Importacion imp = importacionService.importarEmpleadores(archivo);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Archivo de empleadores importado con éxito",
                    "id", imp.getId(),
                    "cargadas", imp.getFilasCargadas(),
                    "rechazadas", imp.getFilasRechazadas()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}