package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // Búsqueda por nombre, apellido o email (case-insensitive)
    @Query("SELECT c FROM Cliente c WHERE " +
           "LOWER(c.nombre)   LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(c.apellido) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(c.email)    LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(c.nombrePadre)   LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(c.apellidoPadre) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Cliente> buscar(@Param("q") String q);

    List<Cliente> findAllByOrderByFechaRegistroDesc();
}