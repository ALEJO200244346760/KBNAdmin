package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ClaseRepository extends JpaRepository<ClaseRegistro, Long> {

    // Esta consulta es clave. Suma condicionalmente según la columna 'asignado_a'.
    @Query(value = "SELECT " +
            "SUM(c.total) AS totalIngresosBrutos, " +
            "SUM(c.gastos_asociados) AS totalGastos, " +
            "SUM(c.comision) AS totalComisiones, " +
            "SUM(CASE WHEN c.asignado_a = 'IGNA' THEN c.total ELSE 0 END) AS totalAsignadoIgna, " +
            "SUM(CASE WHEN c.asignado_a = 'JOSE' THEN c.total ELSE 0 END) AS totalAsignadoJose " +
            "FROM clases_registros c " +
            "WHERE c.fecha BETWEEN :fechaInicio AND :fechaFin",
            nativeQuery = true)
    Optional<ReporteKiteDTO> getReporteEntreFechas(LocalDate fechaInicio, LocalDate fechaFin);
    // Usamos Optional porque puede que no haya datos en el rango.
}