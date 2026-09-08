package com.kbn_backend.kbn_backend.repository;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PagoPasivoRepository extends JpaRepository<PagoPasivo, Long> {
    List<PagoPasivo> findByOrigenIngresoId(Long origenIngresoId);
}