package com.example.mi_backend.service;

import com.example.mi_backend.model.Importacion;
import com.example.mi_backend.repository.ImportacionRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImportacionService {

    private final ImportacionRepository importacionRepository;
    private final JdbcTemplate jdbcTemplate;

    public ImportacionService(ImportacionRepository importacionRepository, JdbcTemplate jdbcTemplate) {
        this.importacionRepository = importacionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Importacion importarTitulados(MultipartFile file) throws Exception {
        Importacion imp = new Importacion();
        imp.setTipoEncuesta("titulados");
        imp.setNombreArchivo(file.getOriginalFilename());
        imp = importacionRepository.save(imp);

        int leidas = 0;
        int cargadas = 0;

        List<Object[]> batchTitulados = new ArrayList<>();
        List<Object[]> batchSituacion = new ArrayList<>();
        List<Object[]> batchEmpleos = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                leidas++;

                // Mapeo exacto de columnas del archivo de Titulados
                int idForms = (int) getNumericValue(row.getCell(0));
                String edad = getStringValue(row.getCell(8));
                String genero = getStringValue(row.getCell(11));
                String situacion = getStringValue(row.getCell(49));
                String rubro = getStringValue(row.getCell(55));
                String sector = getStringValue(row.getCell(61));
                String departamento = getStringValue(row.getCell(64));
                String cargo = getStringValue(row.getCell(73));
                String remuneracion = getStringValue(row.getCell(90));

                // 1. Insertar fila base en supertipo respuesta
                Long respId = jdbcTemplate.queryForObject(
                        "INSERT INTO respuesta (importacion_id, tipo, id_forms, fecha_envio) VALUES (?, 'titulado', ?, now()) RETURNING id",
                        Long.class, imp.getId(), idForms
                );

                // 2. Acumular en lotes
                batchTitulados.add(new Object[]{ respId, edad, genero });
                batchSituacion.add(new Object[]{ respId, situacion });
                batchEmpleos.add(new Object[]{ respId, rubro, sector, departamento, cargo, remuneracion });
                cargadas++;

                if (batchTitulados.size() >= 100) {
                    flushTitulados(batchTitulados, batchSituacion, batchEmpleos);
                }
            }

            if (!batchTitulados.isEmpty()) {
                flushTitulados(batchTitulados, batchSituacion, batchEmpleos);
            }
        }

        imp.setFilasLeidas(leidas);
        imp.setFilasCargadas(cargadas);
        imp.setFilasRechazadas(leidas - cargadas);
        return importacionRepository.save(imp);
    }

    @Transactional
    public Importacion importarEmpleadores(MultipartFile file) throws Exception {
        Importacion imp = new Importacion();
        imp.setTipoEncuesta("empleadores");
        imp.setNombreArchivo(file.getOriginalFilename());
        imp = importacionRepository.save(imp);

        int leidas = 0;
        int cargadas = 0;

        List<Object[]> batchEmpleadores = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                leidas++;

                // Mapeo exacto de columnas del archivo de Empleadores
                String correo = getStringValue(row.getCell(1));
                String org = getStringValue(row.getCell(2));
                String tipoOrg = getStringValue(row.getCell(3));
                String tamano = getStringValue(row.getCell(4));
                String rubro = getStringValue(row.getCell(5));
                String prob = getStringValue(row.getCell(7));

                Long respId = jdbcTemplate.queryForObject(
                        "INSERT INTO respuesta (importacion_id, tipo, fecha_envio) VALUES (?, 'empleador', now()) RETURNING id",
                        Long.class, imp.getId()
                );

                batchEmpleadores.add(new Object[]{ respId, correo, org, tipoOrg, tamano, rubro, prob });
                cargadas++;

                if (batchEmpleadores.size() >= 100) {
                    flushEmpleadores(batchEmpleadores);
                }
            }

            if (!batchEmpleadores.isEmpty()) {
                flushEmpleadores(batchEmpleadores);
            }
        }

        imp.setFilasLeidas(leidas);
        imp.setFilasCargadas(cargadas);
        imp.setFilasRechazadas(leidas - cargadas);
        return importacionRepository.save(imp);
    }

    private void flushTitulados(List<Object[]> titulados, List<Object[]> situacion, List<Object[]> empleos) {
        jdbcTemplate.batchUpdate("INSERT INTO titulado (id, edad_rango, genero) VALUES (?, ?, ?)", titulados);
        jdbcTemplate.batchUpdate("INSERT INTO situacion_laboral (titulado_id, situacion) VALUES (?, ?)", situacion);
        jdbcTemplate.batchUpdate("INSERT INTO empleo_actual (titulado_id, rubro, sector, departamento, cargo, remuneracion) VALUES (?, ?, ?, ?, ?, ?)", empleos);
        titulados.clear();
        situacion.clear();
        empleos.clear();
    }

    private void flushEmpleadores(List<Object[]> empleadores) {
        jdbcTemplate.batchUpdate("INSERT INTO empleador (id, correo, organizacion, tipo_organizacion, tamano, rubro, prob_contratacion) VALUES (?, ?, ?, ?, ?, ?, ?)", empleadores);
        empleadores.clear();
    }

    private String getStringValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue().trim();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return null;
    }

    private double getNumericValue(Cell cell) {
        if (cell == null) return 0;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        return 0;
    }
}