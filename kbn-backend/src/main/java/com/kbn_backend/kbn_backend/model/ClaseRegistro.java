package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "clases_registros")
public class ClaseRegistro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long pasivoId;

    @Column(nullable = false)
    private String tipoTransaccion; // "INGRESO" o "EGRESO"

    /**
     * Solo se usa cuando tipoTransaccion = "EGRESO" y pasivoId != null.
     * Valores posibles:
     *   "ADELANTO"   → Le damos plata al profe, él nos debe. Suma al montoTotal del pasivo (positivo).
     *   "PAGO_DEUDA" → Pagamos una deuda que teníamos. Suma al montoTotal del pasivo (reduce deuda negativa).
     * En ambos casos sale plata de caja (EGRESO), pero el efecto en el pasivo es siempre SUMAR.
     * La diferencia semántica queda en este campo para el historial/reportes.
     */
    private String tipoMovimientoPasivo; // "ADELANTO" o "PAGO_DEUDA"

    @Column(nullable = false)
    private String fecha;

    @Column(nullable = false)
    private String actividad;

    @Column(length = 500)
    private String descripcionActividad;

    private String vendedor;

    @Column(nullable = false)
    private String instructor;

    @Column(columnDefinition = "TEXT")
    private String detalles;

    private String cantidadHoras;
    private String tarifaPorHora;
    private String total;

    @Column(nullable = false)
    private String moneda;

    private String gastosAsociados;
    private String comision;

    private String formaPago;
    private String detalleFormaPago;

    private String asignadoA;

    // IDs de las clases de agenda cubiertas por este ingreso (ej: "3,7,12")
    // Permite que un solo pago de un padre cubra múltiples clases de sus hijos.
    @Column(columnDefinition = "TEXT")
    private String agendaIds;

    private boolean revisado = false;
}