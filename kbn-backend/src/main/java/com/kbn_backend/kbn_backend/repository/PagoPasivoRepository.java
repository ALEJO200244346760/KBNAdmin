package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.PagoPasivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagoPasivoRepository extends JpaRepository<PagoPasivo, Long> {

    /** Movimientos de reparto generados por un ingreso. */
    List<PagoPasivo> findByOrigenIngresoId(Long origenIngresoId);

    /** Liquidaciones generadas por una clase de la agenda. */
    List<PagoPasivo> findByOrigenAgendaId(Long origenAgendaId);
}