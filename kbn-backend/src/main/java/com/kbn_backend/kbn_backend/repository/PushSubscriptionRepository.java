// repository/PushSubscriptionRepository.java
package com.kbn_backend.kbn_backend.repository;

import com.kbn_backend.kbn_backend.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUsuarioId(Long usuarioId);
    Optional<PushSubscription> findByEndpoint(String endpoint);
    void deleteByUsuarioId(Long usuarioId);
}