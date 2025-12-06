package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UbicacionRepository extends JpaRepository<Ubicacion, Long> {
    Ubicacion findByNombre(String nombre);
}
