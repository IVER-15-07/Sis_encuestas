package com.example.mi_backend.dto;

import java.util.List;

public class ChiCuadradoResultDTO {
    private double chiCuadrado;
    private int gradosLibertad;
    private double pValor;
    private List<String> categoriasFila;
    private List<String> categoriasColumna;
    private long[][] observados;
    private double[][] esperados;

    public ChiCuadradoResultDTO(double chiCuadrado, int gradosLibertad, double pValor,
                                List<String> categoriasFila, List<String> categoriasColumna,
                                long[][] observados, double[][] esperados) {
        this.chiCuadrado = chiCuadrado;
        this.gradosLibertad = gradosLibertad;
        this.pValor = pValor;
        this.categoriasFila = categoriasFila;
        this.categoriasColumna = categoriasColumna;
        this.observados = observados;
        this.esperados = esperados;
    }

    public double getChiCuadrado() { return chiCuadrado; }
    public int getGradosLibertad() { return gradosLibertad; }
    public double getpValor() { return pValor; }
    public List<String> getCategoriasFila() { return categoriasFila; }
    public List<String> getCategoriasColumna() { return categoriasColumna; }
    public long[][] getObservados() { return observados; }
    public double[][] getEsperados() { return esperados; }
}