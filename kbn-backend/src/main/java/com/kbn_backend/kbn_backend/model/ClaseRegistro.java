package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
@Table(name = "clases_registros")
public class ClaseRegistro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- CAMPO NUEVO PARA INGRESOS/EGRESOS ---
    @Column(nullable = false)
    private String tipoTransaccion; // VALORES: "INGRESO" o "EGRESO"

    // --- CAMPOS QUE RELLENA EL INSTRUCTOR ---

    @Column(nullable = false)
    private String fecha;

    @Column(nullable = false)
    private String actividad;

    @Column(length = 500)
    private String descripcionActividad;

    private String vendedor;

    @Column(nullable = false)
    private String instructor; // Nombre del instructor, sea auto-llenado o seleccionado por Admin

    @Column(columnDefinition = "TEXT")
    private String detalles;

    private String cantidadHoras;     // Antes Double
    private String tarifaPorHora;     // Antes Double
    private String total;             // Antes Double

    @Column(nullable = false)
    private String moneda; // Valores posibles: "ARS", "CLP", "USD", "BRL", etc.

    private String gastosAsociados;   // Antes Double
    private String comision;          // Antes Double

    private String formaPago;
    private String detalleFormaPago;

    // --- CAMPOS EXCLUSIVOS DEL ADMINISTRADOR ---

    private String asignadoA; // "IGNA", "JOSE", "NINGUNO". Solo aplica a INGRESO.

    private boolean revisado = false;
}
