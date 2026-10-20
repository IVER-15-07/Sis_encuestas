package com.example.mi_backend.service;

import com.example.mi_backend.dto.ChiCuadradoResultDTO;
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

    public ChiCuadradoResultDTO calcularChiCuadrado(String variableFila, String variableColumna, Long importacionId) {
        // Validar columnas permitidas para evitar inyecciones SQL
        Set<String> permitidas = Set.of("edad_rango", "genero", "situacion", "rubro", "sector", "cargo", "remuneracion");
        
        String colFila = variableFila.equals("edad") ? "edad_rango" : variableFila;
        String colCol = variableColumna.equals("edad") ? "edad_rango" : variableColumna;

        if (!permitidas.contains(colFila) || !permitidas.contains(colCol)) {
            throw new IllegalArgumentException("Variable no permitida para el cruce.");
        }

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT t.").append(colFila).append(" AS fila, t.").append(colCol).append(" AS columna, COUNT(*) AS total ")
           .append("FROM v_titulados_plano t ")
           .append("JOIN respuesta r ON r.id = t.id ")
           .append("WHERE t.").append(colFila).append(" IS NOT NULL AND t.").append(colCol).append(" IS NOT NULL ");

        if (importacionId != null && importacionId > 0) {
            sql.append("AND r.importacion_id = ").append(importacionId).append(" ");
        }

        sql.append("GROUP BY t.").append(colFila).append(", t.").append(colCol);

        List<Map<String, Object>> filasQuery = jdbcTemplate.queryForList(sql.toString());

        if (filasQuery.isEmpty()) {
            throw new IllegalStateException("No hay datos suficientes para realizar el cálculo de Chi-cuadrado.");
        }

        // Construir tabla de contingencia
        Set<String> setFilas = new TreeSet<>();
        Set<String> setColumnas = new TreeSet<>();
        Map<String, Map<String, Long>> frecuencias = new HashMap<>();

        for (Map<String, Object> r : filasQuery) {
            String f = String.valueOf(r.get("fila")).trim();
            String c = String.valueOf(r.get("columna")).trim();
            long total = ((Number) r.get("total")).longValue();

            if (f.isEmpty() || c.isEmpty() || f.equals("null") || c.equals("null")) continue;

            setFilas.add(f);
            setColumnas.add(c);
            frecuencias.computeIfAbsent(f, k -> new HashMap<>()).put(c, total);
        }

        List<String> listFilas = new ArrayList<>(setFilas);
        List<String> listColumnas = new ArrayList<>(setColumnas);

        if (listFilas.size() < 2 || listColumnas.size() < 2) {
            throw new IllegalStateException("Se requieren al menos 2 categorías distintas por variable para calcular Chi-cuadrado.");
        }

        long[][] observados = new long[listFilas.size()][listColumnas.size()];
        for (int i = 0; i < listFilas.size(); i++) {
            String f = listFilas.get(i);
            for (int j = 0; j < listColumnas.size(); j++) {
                String c = listColumnas.get(j);
                observados[i][j] = frecuencias.getOrDefault(f, Collections.emptyMap()).getOrDefault(c, 0L);
            }
        }

        ChiSquareTest chiTest = new ChiSquareTest();
        double chiCuadrado = chiTest.chiSquare(observados);
        double pValor = chiTest.chiSquareTest(observados);
        int gradosLibertad = (listFilas.size() - 1) * (listColumnas.size() - 1);

        return new ChiCuadradoResultDTO(
                chiCuadrado,
                gradosLibertad,
                pValor,
                listFilas,
                listColumnas,
                observados
        );
    }
}