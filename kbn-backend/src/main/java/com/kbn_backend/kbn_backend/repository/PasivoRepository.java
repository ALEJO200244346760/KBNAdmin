package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Pasivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasivoRepository extends JpaRepository<Pasivo, Long> {
}