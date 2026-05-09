package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
public class PagoPasivo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Double montoPagado;
    private LocalDate fecha;
    private String nota;

    @ManyToOne
    @JoinColumn(name = "pasivo_id")
    private Pasivo pasivo;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Double getMontoPagado() {
        return montoPagado;
    }

    public void setMontoPagado(Double montoPagado) {
        this.montoPagado = montoPagado;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public String getNota() {
        return nota;
    }

    public void setNota(String nota) {
        this.nota = nota;
    }

    public Pasivo getPasivo() {
        return pasivo;
    }

    public void setPasivo(Pasivo pasivo) {
        this.pasivo = pasivo;
    }
}