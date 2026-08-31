package com.kbn_backend.kbn_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
public class PagoPasivo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double montoPagado;
    private LocalDate fecha;
    private String nota;
    // Moneda en la que se hizo este movimiento (BRL, EUR_WIZE_IGNA, USD_EFECTIVO, etc.)
    // Null = BRL legacy (antes de este campo)
    private String moneda;

    // Id del ClaseRegistro (ingreso) que generó este movimiento de reparto.
    // null = movimiento manual (pago, adelanto, deuda) o liquidación de clase.
    // Permite resincronizar el reparto cuando el ingreso se edita o se borra.
    private Long origenIngresoId;

    @ManyToOne
    @JoinColumn(name = "pasivo_id")
    @JsonBackReference // ESTO ES VITAL
    private Pasivo pasivo;
}