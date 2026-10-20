package com.example.mi_backend.dto;

import java.util.List;

public class ChiCuadradoResultDTO {
   private Double chiCuadrado;
    private Integer gradosLibertad;
    private Double pValor;
    private List<String> categoriasFila;
    private List<String> categoriasColumna;
    private long[][] observados;

    public ChiCuadradoResultDTO() {}

    public ChiCuadradoResultDTO(Double chiCuadrado, Integer gradosLibertad, Double pValor,
                                List<String> categoriasFila, List<String> categoriasColumna, long[][] observados) {
        this.chiCuadrado = chiCuadrado;
        this.gradosLibertad = gradosLibertad;
        this.pValor = pValor;
        this.categoriasFila = categoriasFila;
        this.categoriasColumna = categoriasColumna;
        this.observados = observados;
    }

    public Double getChiCuadrado() { return chiCuadrado; }
    public void setChiCuadrado(Double chiCuadrado) { this.chiCuadrado = chiCuadrado; }

    public Integer getGradosLibertad() { return gradosLibertad; }
    public void setGradosLibertad(Integer gradosLibertad) { this.gradosLibertad = gradosLibertad; }

    public Double getPValor() { return pValor; }
    public void setPValor(Double pValor) { this.pValor = pValor; }

    public List<String> getCategoriasFila() { return categoriasFila; }
    public void setCategoriasFila(List<String> categoriasFila) { this.categoriasFila = categoriasFila; }

    public List<String> getCategoriasColumna() { return categoriasColumna; }
    public void setCategoriasColumna(List<String> categoriasColumna) { this.categoriasColumna = categoriasColumna; }

    public long[][] getObservados() { return observados; }
    public void setObservados(long[][] observados) { this.observados = observados; }
}