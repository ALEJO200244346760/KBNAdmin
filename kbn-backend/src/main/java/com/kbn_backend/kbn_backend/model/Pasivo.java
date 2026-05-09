package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Entity
@Data // Si usas Lombok, sino genera getters/setters
public class Pasivo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String titulo;
    private String descripcion;
    private Double montoTotal;
    private String moneda;
    private String fecha;

    @OneToMany(mappedBy = "pasivo", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PagoPasivo> historialPagos;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Double getMontoTotal() {
        return montoTotal;
    }

    public void setMontoTotal(Double montoTotal) {
        this.montoTotal = montoTotal;
    }

    public String getMoneda() {
        return moneda;
    }

    public void setMoneda(String moneda) {
        this.moneda = moneda;
    }

    public String getFecha() {
        return fecha;
    }

    public void setFecha(String fecha) {
        this.fecha = fecha;
    }

    public List<PagoPasivo> getHistorialPagos() {
        return historialPagos;
    }

    public void setHistorialPagos(List<PagoPasivo> historialPagos) {
        this.historialPagos = historialPagos;
    }
}