package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolRepository extends JpaRepository<Rol, Long> {
    Rol findByNombre(String nombre);
}
