package com.kbn_backend.kbn_backend.dto;

public interface ReporteKiteDTO {
    Double getTotalIngresosBrutos();
    // Gastos asociados a transacciones de INGRESO
    Double getTotalGastos();
    // NUEVO: Monto total de todas las transacciones de EGRESO
    Double getTotalEgresos();
    Double getTotalComisiones();
    Double getTotalAsignadoIgna();
    Double getTotalAsignadoJose();
}