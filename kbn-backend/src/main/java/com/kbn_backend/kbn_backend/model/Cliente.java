package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Datos principales ────────────────────────────────────────────────────
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private String nacionalidad;

    // ── ¿Es menor de edad? ───────────────────────────────────────────────────
    // Si esNino=true, nombre/apellido son del niño y los campos padre son del tutor.
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean esNino = false;

    // Datos del padre/tutor (solo cuando esNino=true)
    private String nombrePadre;
    private String apellidoPadre;
    private String emailPadre;
    private String telefonoPadre;

    // ── Extra ────────────────────────────────────────────────────────────────
    private String notas;

    @Column(nullable = false, updatable = false)
    private LocalDate fechaRegistro = LocalDate.now();

    public Cliente() {}

    // Getters y Setters
    public Long      getId()             { return id; }
    public String    getNombre()         { return nombre; }
    public String    getApellido()       { return apellido; }
    public String    getEmail()          { return email; }
    public String    getTelefono()       { return telefono; }
    public String    getNacionalidad()   { return nacionalidad; }
    public boolean   isEsNino()          { return esNino; }
    public String    getNombrePadre()    { return nombrePadre; }
    public String    getApellidoPadre()  { return apellidoPadre; }
    public String    getEmailPadre()     { return emailPadre; }
    public String    getTelefonoPadre()  { return telefonoPadre; }
    public String    getNotas()          { return notas; }
    public LocalDate getFechaRegistro()  { return fechaRegistro; }

    public void setId(Long id)                       { this.id = id; }
    public void setNombre(String v)                  { this.nombre = v; }
    public void setApellido(String v)                { this.apellido = v; }
    public void setEmail(String v)                   { this.email = v; }
    public void setTelefono(String v)                { this.telefono = v; }
    public void setNacionalidad(String v)            { this.nacionalidad = v; }
    public void setEsNino(boolean v)                 { this.esNino = v; }
    public void setNombrePadre(String v)             { this.nombrePadre = v; }
    public void setApellidoPadre(String v)           { this.apellidoPadre = v; }
    public void setEmailPadre(String v)              { this.emailPadre = v; }
    public void setTelefonoPadre(String v)           { this.telefonoPadre = v; }
    public void setNotas(String v)                   { this.notas = v; }
    public void setFechaRegistro(LocalDate v)        { this.fechaRegistro = v; }
}