package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Presencia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface PresenciaRepository extends JpaRepository<Presencia, Long> {
    Optional<Presencia> findByFecha(LocalDate fecha);
}