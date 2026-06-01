// controller/PushController.java
package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.PushSubscription;
import com.kbn_backend.kbn_backend.repository.PushSubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushController {

    @Autowired
    private PushSubscriptionRepository pushRepo;

    // Guardar suscripción del browser
    @PostMapping("/suscribir")
    public ResponseEntity<?> suscribir(@RequestBody Map<String, String> body) {
        Long usuarioId = Long.parseLong(body.get("usuarioId"));
        String endpoint = body.get("endpoint");

        // Si ya existe esa suscripción, no duplicar
        if (pushRepo.findByEndpoint(endpoint).isPresent()) {
            return ResponseEntity.ok("Ya suscripto");
        }

        PushSubscription sub = new PushSubscription();
        sub.setUsuarioId(usuarioId);
        sub.setEndpoint(endpoint);
        sub.setP256dh(body.get("p256dh"));
        sub.setAuth(body.get("auth"));

        pushRepo.save(sub);
        return ResponseEntity.ok("Suscripción guardada");
    }

    // Eliminar suscripción
    @DeleteMapping("/desuscribir/{usuarioId}")
    public ResponseEntity<?> desuscribir(@PathVariable Long usuarioId) {
        pushRepo.deleteByUsuarioId(usuarioId);
        return ResponseEntity.ok("Desuscripto");
    }
}