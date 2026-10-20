package com.example.mi_backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "v_titulados_plano")
public class VTituladosPlano {

    @Id
    private Long id;

    @Column(name = "edad_rango")
    private String edadRango;

    private String genero;
    private String situacion;
    private String rubro;
    private String sector;
    private String cargo;
    private String remuneracion;

    public Long getId() { return id; }
    public String getEdadRango() { return edadRango; }
    public String getGenero() { return genero; }
    public String getSituacion() { return situacion; }
    public String getRubro() { return rubro; }
    public String getSector() { return sector; }
    public String getCargo() { return cargo; }
    public String getRemuneracion() { return remuneracion; }
}