package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.PushSubscription;
import com.kbn_backend.kbn_backend.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
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
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public void enviarNotificacion(Long usuarioId, String titulo, String cuerpo, String url) {
        List<PushSubscription> suscripciones = pushRepo.findByUsuarioId(usuarioId);

        System.out.println("=== PUSH DEBUG ===");
        System.out.println("Buscando suscripciones para usuarioId: " + usuarioId);
        System.out.println("Suscripciones encontradas: " + suscripciones.size());
        System.out.println("VAPID Public Key: " + vapidPublicKey);

        if (suscripciones.isEmpty()) {
            System.out.println("No hay suscripciones — el instructor no activó las notificaciones.");
            return;
        }

        JSONObject payload = new JSONObject();
        payload.put("title", titulo);
        payload.put("body", cuerpo);
        payload.put("url", url != null ? url : "/");

        System.out.println("Payload: " + payload.toString());

        try {
            PushService pushService = new PushService(vapidPublicKey, vapidPrivateKey);

            for (PushSubscription sub : suscripciones) {
                try {
                    System.out.println("Enviando push a endpoint: " + sub.getEndpoint().substring(0, 40) + "...");

                    Subscription subscription = new Subscription(
                            sub.getEndpoint(),
                            new Subscription.Keys(sub.getP256dh(), sub.getAuth())
                    );

                    Notification notification = new Notification(subscription, payload.toString());
                    pushService.send(notification);

                    System.out.println("✅ Push enviada correctamente a sub id: " + sub.getId());
                } catch (Exception e) {
                    System.err.println("❌ Error enviando push a sub " + sub.getId() + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Error inicializando PushService: " + e.getMessage());
            e.printStackTrace();
        }
    }
}