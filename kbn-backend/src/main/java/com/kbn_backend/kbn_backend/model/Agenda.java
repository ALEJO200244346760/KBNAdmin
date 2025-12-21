package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "agenda")
public class Agenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String alumno;
    private LocalDate fecha;
    private LocalTime hora;

    // Relación con el Instructor (Usuario)
    @Column(name = "instructor_id")
    private Long instructorId;

    // Nombre del instructor para visualización rápida (opcional, pero útil)
    private String nombreInstructor;

    private String lugar;
    private Double tarifa;
    private Double horas;
    private Double horasPagadas;
    private String hotelDerivacion;

    // Estados: PENDIENTE, CONFIRMADA, RECHAZADA, FINALIZADA
    private String estado;

    public Agenda() {}

    // Getters y Setters para TODOS los campos
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAlumno() { return alumno; }
    public void setAlumno(String alumno) { this.alumno = alumno; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHora() { return hora; }
    public void setHora(LocalTime hora) { this.hora = hora; }
    public Long getInstructorId() { return instructorId; }
    public void setInstructorId(Long instructorId) { this.instructorId = instructorId; }
    public String getNombreInstructor() { return nombreInstructor; }
    public void setNombreInstructor(String nombreInstructor) { this.nombreInstructor = nombreInstructor; }
    public String getLugar() { return lugar; }
    public void setLugar(String lugar) { this.lugar = lugar; }
    public Double getTarifa() { return tarifa; }
    public void setTarifa(Double tarifa) { this.tarifa = tarifa; }
    public Double getHoras() { return horas; }
    public void setHoras(Double horas) { this.horas = horas; }
    public Double getHorasPagadas() { return horasPagadas; }
    public void setHorasPagadas(Double horasPagadas) { this.horasPagadas = horasPagadas; }
    public String getHotelDerivacion() { return hotelDerivacion; }
    public void setHotelDerivacion(String hotelDerivacion) { this.hotelDerivacion = hotelDerivacion; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}