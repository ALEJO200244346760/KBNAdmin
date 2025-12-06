package com.kbn_backend.kbn_backend.model;

import jakarta.persistence.*;
import lombok.Data; // Asumo que usas Lombok para getters/setters, si no, créalos manual
import java.time.LocalDate;

@Entity
@Data
@Table(name = "clases_registros")
public class ClaseRegistro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- CAMPOS QUE RELLENA EL INSTRUCTOR ---

    @Column(nullable = false)
    private LocalDate fecha; // Se guardará YYYY-MM-DD

    @Column(nullable = false)
    private String actividad; // Ej: "Clases", "Gastos", "Aula Kite", etc.

    @Column(length = 500)
    private String descripcionActividad; // Si elige "Otro", o detalles extra

    private String vendedor; // Opcional

    @Column(nullable = false)
    private String nombreInstructor; // Viene de la sesión, pero editable si es "Otro"

    @Column(columnDefinition = "TEXT")
    private String detalles; // Ej: "Clase a Santa Teresa"

    private Double cantidadHoras;
    private Double tarifaPorHora;
    private Double total; // Calculado: horas * tarifa

    private Double gastosAsociados; // Estadístico (ej: nafta)
    private Double comision;        // Estadístico

    private String formaPago;       // Ej: Efectivo, MP
    private String detalleFormaPago; // Si elige "Otro"

    // --- CAMPOS EXCLUSIVOS DEL ADMINISTRADOR ---

    // Puede ser "IGNA", "JOSE", "NINGUNO". Null al crearse.
    private String asignadoA;

    // Estado para saber si el admin ya lo revisó
    private boolean revisado = false;
}