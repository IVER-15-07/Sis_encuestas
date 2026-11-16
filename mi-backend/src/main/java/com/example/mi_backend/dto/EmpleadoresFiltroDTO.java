package com.example.mi_backend.dto;

public class EmpleadoresFiltroDTO {
    private Long importacionId;
    private String tipoOrganizacion;
    private String tamano;
    private String rubro;
    private Boolean contratoUltimos5;
    private String probContratacion;

    public Long getImportacionId() {
        return importacionId;
    }

    public void setImportacionId(Long importacionId) {
        this.importacionId = importacionId;
    }

    public String getTipoOrganizacion() {
        return tipoOrganizacion;
    }

    public void setTipoOrganizacion(String tipoOrganizacion) {
        this.tipoOrganizacion = tipoOrganizacion;
    }

    public String getTamano() {
        return tamano;
    }

    public void setTamano(String tamano) {
        this.tamano = tamano;
    }

    public String getRubro() {
        return rubro;
    }

    public void setRubro(String rubro) {
        this.rubro = rubro;
    }

    public Boolean getContratoUltimos5() {
        return contratoUltimos5;
    }

    public void setContratoUltimos5(Boolean contratoUltimos5) {
        this.contratoUltimos5 = contratoUltimos5;
    }

    public String getProbContratacion() {
        return probContratacion;
    }

    public void setProbContratacion(String probContratacion) {
        this.probContratacion = probContratacion;
    }
}