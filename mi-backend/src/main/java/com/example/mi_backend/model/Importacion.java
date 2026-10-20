package com.example.mi_backend.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "importacion")
public class Importacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tipo_encuesta", nullable = false)
    private String tipoEncuesta;

    @Column(name = "nombre_archivo", nullable = false)
    private String nombreArchivo;

    @Column(name = "filas_leidas")
    private int filasLeidas;

    @Column(name = "filas_cargadas")
    private int filasCargadas;

    @Column(name = "filas_rechazadas")
    private int filasRechazadas;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private OffsetDateTime creadoEn;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTipoEncuesta() { return tipoEncuesta; }
    public void setTipoEncuesta(String tipoEncuesta) { this.tipoEncuesta = tipoEncuesta; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public int getFilasLeidas() { return filasLeidas; }
    public void setFilasLeidas(int filasLeidas) { this.filasLeidas = filasLeidas; }
    public int getFilasCargadas() { return filasCargadas; }
    public void setFilasCargadas(int filasCargadas) { this.filasCargadas = filasCargadas; }
    public int getFilasRechazadas() { return filasRechazadas; }
    public void setFilasRechazadas(int filasRechazadas) { this.filasRechazadas = filasRechazadas; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
}