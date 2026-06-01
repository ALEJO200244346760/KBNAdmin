package com.kbn_backend.kbn_backend.model;
// model/PushSubscription.java
import jakarta.persistence.*;

@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ID del instructor al que pertenece esta suscripción
    private Long usuarioId;

    // Los tres campos que manda el browser
    @Column(length = 512)
    private String endpoint;

    @Column(length = 256)
    private String p256dh;

    @Column(length = 64)
    private String auth;

    public PushSubscription() {}

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
}