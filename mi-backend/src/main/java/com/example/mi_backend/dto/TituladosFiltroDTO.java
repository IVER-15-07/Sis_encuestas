package com.example.mi_backend.dto;

public class TituladosFiltroDTO {
    private Long importacionId;
    private Integer anioTitulacion; // Calculado: EXTRACT(YEAR FROM r.fecha_envio) - ROUND(sl.anios_vida_profesional)
    private String situacion;
    private String sector;
    private String genero;
    private String edadRango;
    private Boolean interesadoPosgrado;
    private Double umbralAnios = 5.0;

    public Long getImportacionId() { return importacionId; }
    public void setImportacionId(Long importacionId) { this.importacionId = importacionId; }
    public Integer getAnioTitulacion() { return anioTitulacion; }
    public void setAnioTitulacion(Integer anioTitulacion) { this.anioTitulacion = anioTitulacion; }
    public String getSituacion() { return situacion; }
    public void setSituacion(String situacion) { this.situacion = situacion; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }
    public String getEdadRango() { return edadRango; }
    public void setEdadRango(String edadRango) { this.edadRango = edadRango; }
    public Boolean getInteresadoPosgrado() { return interesadoPosgrado; }
    public void setInteresadoPosgrado(Boolean interesadoPosgrado) { this.interesadoPosgrado = interesadoPosgrado; }
    public Double getUmbralAnios() { return umbralAnios != null ? umbralAnios : 5.0; }
    public void setUmbralAnios(Double umbralAnios) { this.umbralAnios = umbralAnios; }
}