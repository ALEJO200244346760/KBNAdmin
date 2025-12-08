package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClaseRepository extends JpaRepository<ClaseRegistro, Long> {

    // Método para listar (ejemplo, se puede mejorar con paginación)
    List<ClaseRegistro> findAllByOrderByFechaDesc();

    // Consulta CORREGIDA para separar Ingresos y Egresos
    @Query(value = "SELECT " +
            // 1. Total Ingresos Brutos (SOLO suma el 'total' de los INGRESO)
            "SUM(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.total ELSE 0 END) AS totalIngresosBrutos, " +

            // 2. Gastos Asociados a Ingresos (SOLO suma 'gastos_asociados' de los INGRESO)
            "SUM(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.gastos_asociados ELSE 0 END) AS totalGastos, " +

            // 3. Suma total de Egresos (Suma 'gastos_asociados' de los EGRESO)
            "SUM(CASE WHEN c.tipo_transaccion = 'EGRESO' THEN c.gastos_asociados ELSE 0 END) AS totalEgresos, " +

            // 4. Comisiones (SOLO suma 'comision' de los INGRESO)
            "SUM(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.comision ELSE 0 END) AS totalComisiones, " +

            // 5. Asignado Igna (SOLO suma 'total' de los INGRESO asignados a IGNA)
            "SUM(CASE WHEN c.tipo_transaccion = 'INGRESO' AND c.asignado_a = 'IGNA' THEN c.total ELSE 0 END) AS totalAsignadoIgna, " +

            // 6. Asignado Jose (SOLO suma 'total' de los INGRESO asignados a JOSE)
            "SUM(CASE WHEN c.tipo_transaccion = 'INGRESO' AND c.asignado_a = 'JOSE' THEN c.total ELSE 0 END) AS totalAsignadoJose " +

            "FROM clases_registros c " +
            "WHERE c.fecha BETWEEN :fechaInicio AND :fechaFin",
            nativeQuery = true)
    Optional<ReporteKiteDTO> getReporteEntreFechas(LocalDate fechaInicio, LocalDate fechaFin);
}