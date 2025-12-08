package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClaseRepository extends JpaRepository<ClaseRegistro, Long> {

    // Método para listar todos los registros ordenados por fecha descendente
    List<ClaseRegistro> findAllByOrderByFechaDesc();

    // Consulta CORREGIDA para separar Ingresos y Egresos
    @Query(value = "SELECT " +
            // 1. Total Ingresos Brutos (SOLO suma el 'total' de los INGRESO)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.total ELSE '0' END AS DECIMAL)) AS totalIngresosBrutos, " +

            // 2. Gastos Asociados a Ingresos (SOLO suma 'gastos_asociados' de los INGRESO)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.gastos_asociados ELSE '0' END AS DECIMAL)) AS totalGastos, " +

            // 3. Suma total de Egresos (Suma 'gastos_asociados' de los EGRESO)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'EGRESO' THEN c.gastos_asociados ELSE '0' END AS DECIMAL)) AS totalEgresos, " +

            // 4. Comisiones (SOLO suma 'comision' de los INGRESO)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'INGRESO' THEN c.comision ELSE '0' END AS DECIMAL)) AS totalComisiones, " +

            // 5. Asignado Igna (SOLO suma 'total' de los INGRESO asignados a IGNA)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'INGRESO' AND c.asignado_a = 'IGNA' THEN c.total ELSE '0' END AS DECIMAL)) AS totalAsignadoIgna, " +

            // 6. Asignado Jose (SOLO suma 'total' de los INGRESO asignados a JOSE)
            "SUM(CAST(CASE WHEN c.tipo_transaccion = 'INGRESO' AND c.asignado_a = 'JOSE' THEN c.total ELSE '0' END AS DECIMAL)) AS totalAsignadoJose " +

            "FROM clases_registros c " +
            "WHERE c.fecha >= :fechaInicio AND c.fecha <= :fechaFin",
            nativeQuery = true)
    Optional<ReporteKiteDTO> getReporteEntreFechas(String fechaInicio, String fechaFin);
}
