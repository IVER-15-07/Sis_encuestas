package com.example.mi_backend.service;

import com.example.mi_backend.dto.ChiCuadradoResultDTO;
import com.example.mi_backend.model.VTituladosPlano;
import com.example.mi_backend.repository.VTituladosPlanoRepository;
import org.apache.commons.math3.stat.inference.ChiSquareTest;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AnalisisService {

    private final VTituladosPlanoRepository tituladosPlanoRepository;

    public AnalisisService(VTituladosPlanoRepository tituladosPlanoRepository) {
        this.tituladosPlanoRepository = tituladosPlanoRepository;
    }

    public ChiCuadradoResultDTO calcularChiCuadrado(String variableFila, String variableColumna) {
        List<VTituladosPlano> registros = tituladosPlanoRepository.findAll();

        List<String> filas = new ArrayList<>();
        List<String> columnas = new ArrayList<>();

        for (VTituladosPlano r : registros) {
            String valFila = extraerValor(r, variableFila);
            String valCol = extraerValor(r, variableColumna);

            if (valFila != null && !valFila.isBlank() && !filas.contains(valFila)) filas.add(valFila);
            if (valCol != null && !valCol.isBlank() && !columnas.contains(valCol)) columnas.add(valCol);
        }

        if (filas.size() < 2 || columnas.size() < 2) {
            throw new IllegalArgumentException("Se requieren al menos 2 categorías por variable para calcular Chi-cuadrado.");
        }

        long[][] observados = new long[filas.size()][columnas.size()];

        for (VTituladosPlano r : registros) {
            String valFila = extraerValor(r, variableFila);
            String valCol = extraerValor(r, variableColumna);

            int fIdx = filas.indexOf(valFila);
            int cIdx = columnas.indexOf(valCol);

            if (fIdx != -1 && cIdx != -1) {
                observados[fIdx][cIdx]++;
            }
        }

        ChiSquareTest chiTest = new ChiSquareTest();
        double estadistico = chiTest.chiSquare(observados);
        double pValor = chiTest.chiSquareTest(observados);
        int gradosLibertad = (filas.size() - 1) * (columnas.size() - 1);

        long[] totalFilas = new long[filas.size()];
        long[] totalColumnas = new long[columnas.size()];
        long totalGeneral = 0;

        for (int i = 0; i < filas.size(); i++) {
            for (int j = 0; j < columnas.size(); j++) {
                totalFilas[i] += observados[i][j];
                totalColumnas[j] += observados[i][j];
                totalGeneral += observados[i][j];
            }
        }

        double[][] esperados = new double[filas.size()][columnas.size()];
        for (int i = 0; i < filas.size(); i++) {
            for (int j = 0; j < columnas.size(); j++) {
                esperados[i][j] = (double) (totalFilas[i] * totalColumnas[j]) / totalGeneral;
            }
        }

        return new ChiCuadradoResultDTO(estadistico, gradosLibertad, pValor, filas, columnas, observados, esperados);
    }

    private String extraerValor(VTituladosPlano obj, String variable) {
        return switch (variable.toLowerCase().trim()) {
            case "edad", "edadrango", "edad_rango" -> obj.getEdadRango();
            case "genero" -> obj.getGenero();
            case "situacion" -> obj.getSituacion();
            case "rubro" -> obj.getRubro();
            case "sector" -> obj.getSector();
            case "cargo" -> obj.getCargo();
            case "remuneracion" -> obj.getRemuneracion();
            default -> null;
        };
    }
}