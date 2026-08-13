package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

// Guarda quién está presente cada día de trabajo.
// Solo existe UN registro por fecha (upsert vía endpoint PUT).
// presentes puede ser: "JOSE", "IGNA", "AMBOS", "AUSENTES"
@Entity
@Table(name = "presencia")
public class Presencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private LocalDate fecha;

    // JOSE | IGNA | AMBOS | AUSENTES
    @Column(nullable = false)
    private String presentes = "AUSENTES";

    // Quién registró el último cambio
    private String modificadoPor;

    public Presencia() {}

    public Long      getId()             { return id; }
    public LocalDate getFecha()          { return fecha; }
    public String    getPresentes()      { return presentes; }
    public String    getModificadoPor()  { return modificadoPor; }

    public void setId(Long id)                       { this.id = id; }
    public void setFecha(LocalDate fecha)            { this.fecha = fecha; }
    public void setPresentes(String presentes)       { this.presentes = presentes; }
    public void setModificadoPor(String m)           { this.modificadoPor = m; }
}