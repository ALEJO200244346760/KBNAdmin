// service/PushNotificationService.java
package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.PushSubscription;
import com.kbn_backend.kbn_backend.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;

@Service
public class PushNotificationService {

    @Autowired
    private PushSubscriptionRepository pushRepo;

    @Value("${vapid.public.key}")
    private String vapidPublicKey;

    @Value("${vapid.private.key}")
    private String vapidPrivateKey;

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    /**
     * Manda una notificación push a todos los dispositivos de un instructor.
     * Llamar desde AgendaController al crear/confirmar una clase.
     */
    public void enviarNotificacion(Long usuarioId, String titulo, String cuerpo, String url) {
        List<PushSubscription> suscripciones = pushRepo.findByUsuarioId(usuarioId);
        if (suscripciones.isEmpty()) return;

        // Payload JSON que recibe el service worker
        JSONObject payload = new JSONObject();
        payload.put("title", titulo);
        payload.put("body", cuerpo);
        payload.put("url", url != null ? url : "/");

        try {
            PushService pushService = new PushService(vapidPublicKey, vapidPrivateKey);

            for (PushSubscription sub : suscripciones) {
                try {
                    nl.martijndwars.webpush.Subscription subscription =
                            new nl.martijndwars.webpush.Subscription(
                                    sub.getEndpoint(),
                                    new nl.martijndwars.webpush.Subscription.Keys(
                                            sub.getP256dh(),
                                            sub.getAuth()
                                    )
                            );

                    Notification notification = new Notification(
                            subscription,
                            payload.toString()
                    );

                    pushService.send(notification);
                } catch (Exception e) {
                    // Si falla una suscripción (dispositivo inactivo), continuar con las demás
                    System.err.println("Error enviando push a sub " + sub.getId() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Error inicializando PushService: " + e.getMessage());
        }
    }
}