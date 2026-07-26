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

    @ManyToOne
    @JoinColumn(name = "pasivo_id")
    @JsonBackReference // ESTO ES VITAL
    private Pasivo pasivo;
}
