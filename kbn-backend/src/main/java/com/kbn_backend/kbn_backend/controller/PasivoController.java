package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/pasivos")
public class PasivoController {

    @Autowired private PasivoRepository pasivoRepository;
    @Autowired private PagoPasivoRepository pagoPasivoRepository;

    // ── DTO para acumular ────────────────────────────────────────────────────
    public static class AcumularRequest {
        private Double monto;   // negativo = deuda, positivo = a favor
        private String nota;
        private String fecha;   // yyyy-MM-dd, opcional
        private String moneda;  // "BRL", "EUR_WIZE_IGNA", "USD_EFECTIVO", etc.

        public Double getMonto()  { return monto;  } public void setMonto(Double m)  { monto  = m; }
        public String getNota()   { return nota;   } public void setNota(String n)   { nota   = n; }
        public String getFecha()  { return fecha;  } public void setFecha(String f)  { fecha  = f; }
        public String getMoneda() { return moneda; } public void setMoneda(String m) { moneda = m; }
    }

    // ── Helper: calcula saldos por moneda a partir del historial ─────────────
    // Retorna un Map<moneda, saldo> ignorando entradas sin moneda (legacy BRL).
    private Map<String, Double> calcularSaldosPorMoneda(Pasivo pasivo) {
        Map<String, Double> saldos = new LinkedHashMap<>();
        if (pasivo.getHistorialPagos() == null) return saldos;
        for (PagoPasivo p : pasivo.getHistorialPagos()) {
            String mon = (p.getMoneda() != null && !p.getMoneda().isBlank()) ? p.getMoneda() : "BRL";
            double monto = p.getMontoPagado() != null ? p.getMontoPagado() : 0;
            saldos.merge(mon, monto, Double::sum);
        }
        return saldos;
    }

    // ── DTO de respuesta enriquecido (incluye saldos por moneda) ────────────
    // Usamos un Map genérico para no crear una clase extra, lo que permite
    // que el JSON devuelto incluya todos los campos de Pasivo + saldosPorMoneda.
    private Map<String, Object> enriquecerPasivo(Pasivo p) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id",            p.getId());
        dto.put("titulo",        p.getTitulo());
        dto.put("descripcion",   p.getDescripcion());
        dto.put("moneda",        p.getMoneda());
        dto.put("fecha",         p.getFecha());
        dto.put("montoTotal",    p.getMontoTotal());
        dto.put("historialPagos", p.getHistorialPagos()); // PagoPasivo ya expone moneda
        dto.put("saldosPorMoneda", calcularSaldosPorMoneda(p));
        return dto;
    }

    // 1. Listar todos (con saldos por moneda)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listarPasivos() {
        List<Map<String, Object>> result = new ArrayList<>();
        pasivoRepository.findAll().forEach(p -> result.add(enriquecerPasivo(p)));
        return ResponseEntity.ok(result);
    }

    // 2. Crear
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        return ResponseEntity.ok(pasivoRepository.save(pasivo));
    }

    // 3. Editar nombre/descripción/saldo manual
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarPasivo(@PathVariable Long id, @RequestBody Pasivo detallesPasivo) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    pasivo.setTitulo(detallesPasivo.getTitulo());
                    pasivo.setDescripcion(detallesPasivo.getDescripcion());
                    pasivo.setMontoTotal(detallesPasivo.getMontoTotal());
                    pasivo.setMoneda(detallesPasivo.getMoneda());
                    pasivo.setFecha(detallesPasivo.getFecha());
                    return ResponseEntity.ok(enriquecerPasivo(pasivoRepository.save(pasivo)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 3b. ACUMULAR — suma deuda interna sin generar movimiento de caja.
    //     Ahora guarda la moneda del movimiento para poder mostrar saldos
    //     multi-moneda (ej: José tiene -240 BRL y -58 EUR separados).
    //
    //     montoTotal sigue siendo la suma en la moneda base de la tarjeta
    //     (BRL para instructores) por compatibilidad legacy; los saldos
    //     reales por moneda se calculan del historial.
    @Transactional
    @PutMapping("/{id}/acumular")
    public ResponseEntity<?> acumularSaldo(@PathVariable Long id, @RequestBody AcumularRequest request) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    double monto = request.getMonto() != null ? request.getMonto() : 0;

                    // montoTotal solo se actualiza para movimientos en la moneda
                    // base de la tarjeta (BRL) o cuando no hay moneda (legacy).
                    // Para monedas distintas, el saldo "real" vive en el historial.
                    String monedaMov = request.getMoneda();
                    String monedaBase = pasivo.getMoneda() != null ? pasivo.getMoneda() : "BRL";
                    boolean esMismaMoneda = monedaMov == null
                            || monedaMov.isBlank()
                            || monedaMov.equals("BRL")
                            || monedaMov.equals(monedaBase)
                            || monedaMov.startsWith("R$_"); // R$_STONE_JOSE etc. = BRL

                    if (esMismaMoneda) {
                        pasivo.setMontoTotal(pasivo.getMontoTotal() + monto);
                    }
                    // Para otras monedas (EUR, USD), montoTotal NO cambia —
                    // el saldo se puede leer siempre de saldosPorMoneda.

                    PagoPasivo registro = new PagoPasivo();
                    registro.setMontoPagado(monto);
                    registro.setFecha(request.getFecha() != null ? LocalDate.parse(request.getFecha()) : LocalDate.now());
                    registro.setNota(request.getNota() != null ? request.getNota() : "Movimiento interno");
                    registro.setMoneda(monedaMov); // ← NUEVO: guarda moneda del movimiento
                    registro.setPasivo(pasivo);

                    pagoPasivoRepository.save(registro);
                    return ResponseEntity.ok(enriquecerPasivo(pasivoRepository.save(pasivo)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Eliminar tarjeta completa
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPasivo(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(pasivo -> { pasivoRepository.delete(pasivo); return ResponseEntity.ok().<Void>build(); })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4b. Eliminar un movimiento puntual del historial y revertir su efecto
    @Transactional
    @DeleteMapping("/{pasivoId}/historial/{pagoId}")
    public ResponseEntity<?> eliminarMovimientoHistorial(
            @PathVariable Long pasivoId,
            @PathVariable Long pagoId) {

        Pasivo pasivo = pasivoRepository.findById(pasivoId).orElse(null);
        if (pasivo == null) return ResponseEntity.notFound().build();

        PagoPasivo pago = pagoPasivoRepository.findById(pagoId).orElse(null);
        if (pago == null) return ResponseEntity.notFound().build();

        if (pago.getPasivo() == null || !pago.getPasivo().getId().equals(pasivoId))
            return ResponseEntity.badRequest().body("Ese movimiento no pertenece a esta tarjeta.");

        double monto = pago.getMontoPagado() != null ? pago.getMontoPagado() : 0;
        String monedaBase = pasivo.getMoneda() != null ? pasivo.getMoneda() : "BRL";
        String monedaPago = pago.getMoneda();

        // Solo revertimos montoTotal si el pago era en la moneda base
        boolean esMismaMoneda = monedaPago == null
                || monedaPago.isBlank()
                || monedaPago.equals("BRL")
                || monedaPago.equals(monedaBase)
                || monedaPago.startsWith("R$_");

        if (esMismaMoneda) {
            pasivo.setMontoTotal(pasivo.getMontoTotal() - monto);
        }

        pagoPasivoRepository.delete(pago);
        return ResponseEntity.ok(enriquecerPasivo(pasivoRepository.save(pasivo)));
    }

    // 5. Obtener una tarjeta por ID (con saldos por moneda)
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerPasivoPorId(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(p -> ResponseEntity.ok(enriquecerPasivo(p)))
                .orElse(ResponseEntity.notFound().build());
    }
}
