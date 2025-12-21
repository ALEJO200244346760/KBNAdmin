package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Agenda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgendaRepository extends JpaRepository<Agenda, Long> {
    List<Agenda> findByInstructorId(Long instructorId);
    List<Agenda> findByEstado(String estado);
}
