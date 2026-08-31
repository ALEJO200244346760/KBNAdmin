package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import com.kbn_backend.kbn_backend.repository.PagoPasivoRepository;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.service.RepartoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/pasivos")
public class PasivoController {

    @Autowired private PasivoRepository pasivoRepository;
    @Autowired private PagoPasivoRepository pagoPasivoRepository;
    @Autowired private ClaseRepository claseRepository;
    @Autowired private RepartoService repartoService;

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

    // ── Códigos de moneda conocidos (para parsear notas legacy) ───────────────
    private static final java.util.Set<String> MONEDAS_CONOCIDAS = new java.util.HashSet<>(java.util.Arrays.asList(
        "BRL", "USD", "EUR", "ARS", "CLP",
        "R$_STONE_JOSE", "R$_STONE_IGNA", "R$_EFECTIVO",
        "USD_EFECTIVO", "USD_MARIANA", "EUR_WIZE_IGNA"
    ));

    // Si un movimiento no tiene moneda guardada (legacy), intenta detectarla
    // leyendo la nota. Formato típico: "16% de Clase — fecha = 58.24 EUR_WIZE_IGNA"
    private String detectarMonedaDeLaNota(String nota) {
        if (nota == null || nota.isBlank()) return "BRL";
        String[] partes = nota.trim().split("\\s+");
        if (partes.length > 0) {
            String ultimo = partes[partes.length - 1];
            if (MONEDAS_CONOCIDAS.contains(ultimo)) return ultimo;
        }
        return "BRL";
    }

    // ── Helper: convierte cualquier canal a moneda base ───────────────────────
    private String monedaBaseDeCanal(String canal) {
        if (canal == null || canal.isBlank() || canal.equals("BRL") || canal.startsWith("R$_")) return "BRL";
        if (canal.startsWith("USD")) return "USD";
        if (canal.startsWith("EUR")) return "EUR";
        if (canal.equals("ARS")) return "ARS";
        if (canal.equals("CLP")) return "CLP";
        return canal;
    }

    // ── Helper: calcula saldos por moneda BASE (BRL/USD/EUR) ─────────────────
    // Agrupa R$_STONE_JOSE, R$_STONE_IGNA, R$_EFECTIVO → BRL
    //         USD_EFECTIVO, USD_MARIANA                 → USD
    //         EUR_WIZE_IGNA                             → EUR
    // Para movimientos legacy (moneda == null), parsea la nota.
    // Todos los montos están expresados en REALES, sin importar en qué caja
    // esté físicamente la plata (Wise, USD efectivo, Stone, etc.).
    // Por eso el saldo es uno solo, en BRL. El canal se conserva como dato
    // informativo en cada movimiento, pero ya no separa el saldo.
    private Map<String, Double> calcularSaldosPorMoneda(Pasivo pasivo) {
        Map<String, Double> saldos = new LinkedHashMap<>();
        if (pasivo.getHistorialPagos() == null) return saldos;
        double total = 0;
        for (PagoPasivo p : pasivo.getHistorialPagos()) {
            total += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
        }
        saldos.put("BRL", Math.round(total * 100.0) / 100.0);
        return saldos;
    }

    // Desglose informativo por caja — no afecta el saldo, solo muestra dónde
    // está repartida la plata.
    private Map<String, Double> calcularDesglosePorCaja(Pasivo pasivo) {
        Map<String, Double> porCaja = new LinkedHashMap<>();
        if (pasivo.getHistorialPagos() == null) return porCaja;
        for (PagoPasivo p : pasivo.getHistorialPagos()) {
            String canal = (p.getMoneda() != null && !p.getMoneda().isBlank())
                    ? p.getMoneda()
                    : detectarMonedaDeLaNota(p.getNota());
            if (canal == null || canal.isBlank()) canal = "BRL";
            double monto = p.getMontoPagado() != null ? p.getMontoPagado() : 0;
            porCaja.merge(canal, monto, Double::sum);
        }
        porCaja.entrySet().removeIf(e -> Math.abs(e.getValue()) < 0.001);
        return porCaja;
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
        dto.put("desglosePorCaja",  calcularDesglosePorCaja(p));
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
    @Transactional
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        double inicial = pasivo.getMontoTotal() != null ? pasivo.getMontoTotal() : 0;
        Pasivo guardado = pasivoRepository.save(pasivo);

        // El monto inicial también se registra como movimiento, para que el
        // saldo siempre se pueda reconstruir desde el historial. Sin esto, la
        // deuda original queda sólo en montoTotal y cualquier recálculo la pierde.
        if (Math.abs(inicial) > 0.001) {
            PagoPasivo mov = new PagoPasivo();
            mov.setMontoPagado(inicial);
            mov.setFecha(LocalDate.now());
            mov.setMoneda("BRL");
            mov.setNota("Saldo inicial de la cuenta");
            mov.setPasivo(guardado);
            guardado.getHistorialPagos().add(mov);
            guardado.setMontoTotal(inicial);
            guardado = pasivoRepository.save(guardado);
        }
        return ResponseEntity.ok(guardado);
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

                    // Todos los montos están expresados en reales, sin importar
                    // en qué caja esté la plata (Wise, USD efectivo, Stone...).
                    // Por eso montoTotal suma SIEMPRE, sea cual sea el canal.
                    double totalPrevio = pasivo.getMontoTotal() != null ? pasivo.getMontoTotal() : 0;
                    pasivo.setMontoTotal(totalPrevio + monto);

                    // El canal se sigue guardando en el movimiento: ya no define
                    // la moneda del monto, pero sirve para saber de qué caja salió.
                    String monedaMov = request.getMoneda();

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

        // Sacar el pago de la colección del padre.
        // Con cascade=ALL + orphanRemoval=true, esto es lo que dispara el DELETE.
        // Llamar solo a pagoPasivoRepository.delete() no alcanza: el save()
        // posterior del padre lo reinserta por cascade con el mismo id.
        pasivo.getHistorialPagos().removeIf(x -> x.getId().equals(pagoId));

        // Recalcular montoTotal desde cero sumando solo movimientos BRL del historial.
        // Esto garantiza consistencia independientemente del estado previo de montoTotal,
        // evitando el error de restar un monto en EUR/USD de un total en BRL.
        recalcularTotalBRL(pasivo);

        return ResponseEntity.ok(enriquecerPasivo(pasivoRepository.save(pasivo)));
    }

    // ══════════════════════════════════════════════════════════════════════
    // LIMPIEZA DE DUPLICADOS DE REPARTO
    //
    // Contexto: durante un tiempo el reparto a los dueños se ejecutaba dos
    // veces — una al crear el ingreso (Ingreso.jsx) y otra al asignarlo
    // (Estadísticas). Los de Ingreso.jsx quedaron con una nota que termina
    // en la fecha, sin el sufijo " = monto MONEDA" ni "| Reparto:".
    //
    // Un movimiento se considera duplicado SOLO si cumple TODO:
    //   1. montoPagado < 0        → es deuda (nunca toca pagos ni adelantos)
    //   2. fecha >= FECHA_DESDE   → 2026-08-13 en adelante
    //   3. la nota es del tipo "<pct>% de <algo> — <fecha>" y NO contiene
    //      " = " ni "| Reparto:"  → descarta liquidaciones de clase (APK/APWF…)
    //   4. existe OTRO movimiento en la MISMA tarjeta con idéntica fecha,
    //      idéntico monto e idéntico porcentaje que SÍ tiene " = " o
    //      "| Reparto:" → o sea, el "gemelo bueno" que hay que conservar
    //
    // El emparejamiento es 1 a 1: si hay 2 buenos y 3 candidatos, borra 2.
    // ══════════════════════════════════════════════════════════════════════

    private static final LocalDate FECHA_DESDE = LocalDate.of(2026, 8, 13);

    /** Recalcula montoTotal sumando TODO el historial (todo está en reales). */
    private void recalcularTotalBRL(Pasivo pasivo) {
        double totalBRL = 0;
        if (pasivo.getHistorialPagos() != null) {
            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                totalBRL += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
            }
        }
        pasivo.setMontoTotal(totalBRL);
    }

    // "16% de Ingreso — 2026-08-16"  /  "12,5% de Clase de Kite — 2026-08-20"
    private static final Pattern NOTA_SIN_SUFIJO =
            Pattern.compile("^\\s*(\\d+(?:[.,]\\d+)?)\\s*%\\s+de\\s+.+?—\\s*\\d{4}-\\d{2}-\\d{2}\\s*$");
    // Captura el porcentaje de cualquier nota de reparto
    private static final Pattern PCT = Pattern.compile("^\\s*(\\d+(?:[.,]\\d+)?)\\s*%");

    private String pctDe(String nota) {
        if (nota == null) return null;
        Matcher m = PCT.matcher(nota);
        return m.find() ? m.group(1).replace(',', '.') : null;
    }

    private boolean esCandidatoDuplicado(PagoPasivo p) {
        if (p.getMontoPagado() == null || p.getMontoPagado() >= 0) return false;      // solo deuda
        if (p.getFecha() == null || p.getFecha().isBefore(FECHA_DESDE)) return false; // solo desde 13/08
        String nota = p.getNota();
        if (nota == null) return false;
        if (nota.contains(" = ") || nota.contains("| Reparto:")) return false;        // ese es el bueno
        return NOTA_SIN_SUFIJO.matcher(nota).matches();
    }

    private boolean esGemeloBueno(PagoPasivo p) {
        if (p.getMontoPagado() == null || p.getMontoPagado() >= 0) return false;
        if (p.getFecha() == null || p.getFecha().isBefore(FECHA_DESDE)) return false;
        String nota = p.getNota();
        if (nota == null) return false;
        if (!(nota.contains(" = ") || nota.contains("| Reparto:"))) return false;
        return pctDe(nota) != null;
    }

    /** Clave de emparejamiento: fecha + monto exacto + porcentaje. */
    private String claveMatch(PagoPasivo p) {
        String pct = pctDe(p.getNota());
        return p.getFecha() + "|" + String.format(Locale.US, "%.2f", p.getMontoPagado()) + "|" + pct;
    }

    /** Devuelve los movimientos a borrar de un pasivo, ya emparejados 1 a 1. */
    private List<PagoPasivo> duplicadosDe(Pasivo pasivo) {
        List<PagoPasivo> res = new ArrayList<>();
        if (pasivo.getHistorialPagos() == null) return res;

        // Contar gemelos buenos por clave
        Map<String, Integer> buenos = new HashMap<>();
        for (PagoPasivo p : pasivo.getHistorialPagos()) {
            if (esGemeloBueno(p)) buenos.merge(claveMatch(p), 1, Integer::sum);
        }
        // Consumir un bueno por cada candidato
        for (PagoPasivo p : pasivo.getHistorialPagos()) {
            if (!esCandidatoDuplicado(p)) continue;
            String k = claveMatch(p);
            int disponibles = buenos.getOrDefault(k, 0);
            if (disponibles > 0) {
                buenos.put(k, disponibles - 1);
                res.add(p);
            }
        }
        return res;
    }

    private Map<String, Object> filaPreview(Pasivo pasivo, PagoPasivo p) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("pagoId",  p.getId());
        f.put("tarjeta", pasivo.getTitulo());
        f.put("fecha",   String.valueOf(p.getFecha()));
        f.put("monto",   p.getMontoPagado());
        f.put("moneda",  p.getMoneda());
        f.put("nota",    p.getNota());
        return f;
    }

    // 4c. PREVIEW — no borra nada, solo lista qué se borraría
    @GetMapping("/duplicados/preview")
    public ResponseEntity<Map<String, Object>> previewDuplicados() {
        List<Map<String, Object>> filas = new ArrayList<>();
        Map<String, Integer> porTarjeta = new LinkedHashMap<>();

        for (Pasivo pasivo : pasivoRepository.findAll()) {
            List<PagoPasivo> dups = duplicadosDe(pasivo);
            if (dups.isEmpty()) continue;
            porTarjeta.put(pasivo.getTitulo(), dups.size());
            for (PagoPasivo p : dups) filas.add(filaPreview(pasivo, p));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("desde", FECHA_DESDE.toString());
        out.put("totalAEliminar", filas.size());
        out.put("porTarjeta", porTarjeta);
        out.put("movimientos", filas);
        return ResponseEntity.ok(out);
    }

    // 4d. EJECUTAR — borra los duplicados y recalcula el saldo BRL de cada tarjeta
    @Transactional
    @DeleteMapping("/duplicados")
    public ResponseEntity<Map<String, Object>> eliminarDuplicados(
            @RequestParam(defaultValue = "false") boolean confirmar) {

        if (!confirmar) {
            Map<String, Object> aviso = new LinkedHashMap<>();
            aviso.put("error", "Falta confirmar. Llamá a DELETE /api/pasivos/duplicados?confirmar=true");
            return ResponseEntity.badRequest().body(aviso);
        }

        List<Map<String, Object>> borrados = new ArrayList<>();
        Map<String, Integer> porTarjeta = new LinkedHashMap<>();

        for (Pasivo pasivo : pasivoRepository.findAll()) {
            List<PagoPasivo> dups = duplicadosDe(pasivo);
            if (dups.isEmpty()) continue;
            porTarjeta.put(pasivo.getTitulo(), dups.size());
            for (PagoPasivo p : dups) borrados.add(filaPreview(pasivo, p));

            // IMPORTANTE: con cascade=ALL + orphanRemoval=true hay que sacar el
            // hijo de la colección del padre. Si solo se llama a
            // pagoPasivoRepository.delete(), el save() posterior del padre lo
            // vuelve a insertar por cascade (con el mismo id) y el borrado
            // parece no haber ocurrido nunca.
            Set<Long> aBorrar = new HashSet<>();
            for (PagoPasivo p : dups) aBorrar.add(p.getId());
            pasivo.getHistorialPagos().removeIf(p -> aBorrar.contains(p.getId()));

            recalcularTotalBRL(pasivo);
            pasivoRepository.save(pasivo);
        }
        pasivoRepository.flush();

        // Verificación: volver a analizar desde cero y confirmar que no quedan
        int remanentes = 0;
        for (Pasivo pasivo : pasivoRepository.findAll()) remanentes += duplicadosDe(pasivo).size();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("eliminados", borrados.size());
        out.put("porTarjeta", porTarjeta);
        out.put("duplicadosRestantes", remanentes);
        out.put("verificacion", remanentes == 0
                ? "OK — no quedan duplicados con gemelo"
                : "ATENCION — todavia quedan " + remanentes);
        out.put("detalle", borrados);
        return ResponseEntity.ok(out);
    }

    // 4e. DEBUG — explica movimiento por movimiento por qué entra o no entra
    //      en la limpieza. Sirve para diagnosticar cuando el preview da 0.
    @GetMapping("/duplicados/debug")
    public ResponseEntity<Map<String, Object>> debugDuplicados(
            @RequestParam(required = false) String tarjeta) {

        List<Map<String, Object>> filas = new ArrayList<>();
        int totalMovs = 0;

        for (Pasivo pasivo : pasivoRepository.findAll()) {
            if (tarjeta != null && !pasivo.getTitulo().toLowerCase().contains(tarjeta.toLowerCase()))
                continue;
            if (pasivo.getHistorialPagos() == null) continue;

            // Contar gemelos buenos por clave
            Map<String, Integer> buenos = new HashMap<>();
            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                if (esGemeloBueno(p)) buenos.merge(claveMatch(p), 1, Integer::sum);
            }

            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                totalMovs++;
                Map<String, Object> f = new LinkedHashMap<>();
                f.put("pagoId",  p.getId());
                f.put("tarjeta", pasivo.getTitulo());
                f.put("fecha",   String.valueOf(p.getFecha()));
                f.put("monto",   p.getMontoPagado());
                f.put("nota",    p.getNota());

                String motivo;
                if (p.getMontoPagado() == null || p.getMontoPagado() >= 0) {
                    motivo = "IGNORADO: monto >= 0 (es pago/adelanto, no deuda)";
                } else if (p.getFecha() == null || p.getFecha().isBefore(FECHA_DESDE)) {
                    motivo = "IGNORADO: fecha anterior a " + FECHA_DESDE;
                } else if (p.getNota() == null) {
                    motivo = "IGNORADO: sin nota";
                } else if (p.getNota().contains(" = ") || p.getNota().contains("| Reparto:")) {
                    motivo = "CONSERVAR: es el movimiento bueno (tiene sufijo)";
                } else if (!NOTA_SIN_SUFIJO.matcher(p.getNota()).matches()) {
                    motivo = "IGNORADO: la nota no tiene formato '<pct>% de <algo> — <fecha>'";
                } else {
                    String k = claveMatch(p);
                    int disponibles = buenos.getOrDefault(k, 0);
                    if (disponibles > 0) {
                        buenos.put(k, disponibles - 1);
                        motivo = "BORRAR: tiene gemelo bueno con clave " + k;
                    } else {
                        motivo = "NO SE BORRA: es candidato pero NO existe gemelo bueno "
                               + "con misma fecha+monto+pct (clave " + k + ")";
                    }
                }
                f.put("resultado", motivo);
                filas.add(f);
            }
        }

        // Resumen por tipo de resultado
        Map<String, Integer> resumen = new LinkedHashMap<>();
        for (Map<String, Object> f : filas) {
            String r = String.valueOf(f.get("resultado")).split(":")[0];
            resumen.merge(r, 1, Integer::sum);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("desde", FECHA_DESDE.toString());
        out.put("movimientosAnalizados", totalMovs);
        out.put("resumen", resumen);
        out.put("detalle", filas);
        return ResponseEntity.ok(out);
    }

    // 4f. BORRADO POR IDs — la vía más segura: vos elegís exactamente qué se va.
    //     Body: { "ids": [12, 34, 56] }
    public static class BorrarIdsRequest {
        private List<Long> ids;
        public List<Long> getIds() { return ids; }
        public void setIds(List<Long> ids) { this.ids = ids; }
    }

    @Transactional
    @PostMapping("/duplicados/borrar-ids")
    public ResponseEntity<Map<String, Object>> borrarPorIds(@RequestBody BorrarIdsRequest req) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (req == null || req.getIds() == null || req.getIds().isEmpty()) {
            out.put("error", "Mandá un body { \"ids\": [1,2,3] }");
            return ResponseEntity.badRequest().body(out);
        }

        List<Map<String, Object>> borrados = new ArrayList<>();
        List<Long> noEncontrados = new ArrayList<>();
        List<Long> rechazados    = new ArrayList<>();
        Set<Long>  tarjetas      = new LinkedHashSet<>();
        Set<Long>  idsBorrados   = new HashSet<>();

        for (Long id : req.getIds()) {
            PagoPasivo p = pagoPasivoRepository.findById(id).orElse(null);
            if (p == null) { noEncontrados.add(id); continue; }
            // Seguridad: nunca borrar un movimiento positivo (pago/adelanto)
            if (p.getMontoPagado() == null || p.getMontoPagado() >= 0) { rechazados.add(id); continue; }

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("pagoId", p.getId());
            f.put("fecha",  String.valueOf(p.getFecha()));
            f.put("monto",  p.getMontoPagado());
            f.put("nota",   p.getNota());
            borrados.add(f);

            if (p.getPasivo() != null) tarjetas.add(p.getPasivo().getId());
            idsBorrados.add(p.getId());
        }

        // Sacar los hijos de la colección del padre (orphanRemoval hace el DELETE)
        for (Long tid : tarjetas) {
            Pasivo pasivo = pasivoRepository.findById(tid).orElse(null);
            if (pasivo == null) continue;
            pasivo.getHistorialPagos().removeIf(x -> idsBorrados.contains(x.getId()));
            recalcularTotalBRL(pasivo);
            pasivoRepository.save(pasivo);
        }
        pasivoRepository.flush();

        out.put("eliminados", borrados.size());
        out.put("detalle", borrados);
        if (!noEncontrados.isEmpty()) out.put("noEncontrados", noEncontrados);
        if (!rechazados.isEmpty())    out.put("rechazadosPorSerPositivos", rechazados);
        return ResponseEntity.ok(out);
    }

    // ══════════════════════════════════════════════════════════════════════
    // SINCRONIZAR REPARTOS CON ESTADÍSTICAS
    //
    // Estadísticas calcula el reparto al vuelo desde el monto ACTUAL de cada
    // ingreso, así que es la fuente de verdad. Las tarjetas, en cambio, tienen
    // el reparto congelado de cuando se creó cada movimiento — desactualizado
    // si el ingreso se editó, y a veces duplicado.
    //
    // Este proceso, por cada dueño (Igna, José, Hans):
    //   1. borra TODOS sus movimientos que sean "reparto de un ingreso"
    //      (nota que arranca con "<pct>% de ..."), sin importar duplicados ni
    //      montos viejos;
    //   2. los reconstruye desde los ingresos, con el porcentaje que
    //      corresponde a la asignación y el monto actual.
    //
    // NO toca: pagos, adelantos, deudas manuales, ni liquidaciones de clase a
    // freelancers (esas notas no arrancan con "%").
    // ══════════════════════════════════════════════════════════════════════

    private static final String T_IGNA = "Igna Krebs";
    private static final String T_JOSE = "José Sánchez";
    private static final String T_HANS = "Hans Leonhard Wurbs";

    // Un movimiento de reparto arranca con "<pct>% de "
    private static final Pattern ES_REPARTO = Pattern.compile("^\\s*\\d+(?:[.,]\\d+)?\\s*%\\s+de\\s+");

    private boolean notaEsReparto(String nota) {
        return nota != null && ES_REPARTO.matcher(nota).find();
    }

    private Map<String, Double> porcentajesReparto(String asignadoA) {
        double pIgna, pJose;
        String a = asignadoA == null ? "" : asignadoA.trim().toUpperCase();
        switch (a) {
            case "IGNA":  pIgna = 16;   pJose = 8;    break;
            case "JOSE":  pIgna = 8;    pJose = 16;   break;
            case "AMBOS": pIgna = 12.5; pJose = 12.5; break;
            default:      pIgna = 10;   pJose = 10;   break;
        }
        Map<String, Double> m = new LinkedHashMap<>();
        m.put(T_IGNA, pIgna);
        m.put(T_JOSE, pJose);
        m.put(T_HANS, 5.0);
        return m;
    }

    private double parseMonto(String s) {
        if (s == null || s.isBlank()) return 0;
        try { return Double.parseDouble(s.trim().replace(",", ".")); }
        catch (Exception e) { return 0; }
    }

    private LocalDate parseFechaSafe(String s) {
        try { return LocalDate.parse(s); } catch (Exception e) { return LocalDate.now(); }
    }

    private String fmtPctReparto(double pct) {
        return pct == Math.floor(pct) ? String.valueOf((int) pct)
                                      : String.valueOf(pct).replace('.', ',');
    }

    private Pasivo buscarTarjeta(String titulo) {
        for (Pasivo p : pasivoRepository.findAll()) {
            if (p.getTitulo() != null && p.getTitulo().trim().equalsIgnoreCase(titulo.trim())) return p;
        }
        return null;
    }

    // GET /api/pasivos/sync-reparto/preview   — no modifica nada
    @GetMapping("/sync-reparto/preview")
    public ResponseEntity<Map<String, Object>> previewSyncReparto() {
        return ResponseEntity.ok(sincronizarRepartos(false));
    }

    // POST /api/pasivos/sync-reparto?confirmar=true   — aplica
    @Transactional
    @PostMapping("/sync-reparto")
    public ResponseEntity<Map<String, Object>> ejecutarSyncReparto(
            @RequestParam(defaultValue = "false") boolean confirmar) {
        if (!confirmar) {
            Map<String, Object> aviso = new LinkedHashMap<>();
            aviso.put("error", "Falta confirmar. Agregá ?confirmar=true.");
            aviso.put("sugerencia", "Mirá antes GET /api/pasivos/sync-reparto/preview");
            return ResponseEntity.badRequest().body(aviso);
        }
        return ResponseEntity.ok(sincronizarRepartos(true));
    }

    private Map<String, Object> sincronizarRepartos(boolean ejecutar) {
        // ── Paso 1: qué reparto DEBERÍA tener cada dueño, por ingreso ────────
        //   además juntamos, por dueño, el total esperado.
        Map<String, Double> esperadoPorDueno = new LinkedHashMap<>();
        esperadoPorDueno.put(T_IGNA, 0.0);
        esperadoPorDueno.put(T_JOSE, 0.0);
        esperadoPorDueno.put(T_HANS, 0.0);

        // Movimientos nuevos a crear, agrupados por dueño
        Map<String, List<PagoPasivo>> nuevosPorDueno = new LinkedHashMap<>();
        nuevosPorDueno.put(T_IGNA, new ArrayList<>());
        nuevosPorDueno.put(T_JOSE, new ArrayList<>());
        nuevosPorDueno.put(T_HANS, new ArrayList<>());

        int ingresosConsiderados = 0, sinAsignar = 0;

        for (ClaseRegistro r : claseRepository.findAll()) {
            if (!"INGRESO".equalsIgnoreCase(r.getTipoTransaccion())) continue;
            String asignado = r.getAsignadoA();
            if (asignado == null || asignado.isBlank() || "NINGUNO".equalsIgnoreCase(asignado)) {
                sinAsignar++;
                continue;
            }
            double total = parseMonto(r.getTotal());
            if (total <= 0) continue;
            ingresosConsiderados++;

            String moneda = r.getMoneda() != null && !r.getMoneda().isBlank() ? r.getMoneda() : "BRL";
            String actividad = r.getActividad() != null && !r.getActividad().isBlank()
                    ? r.getActividad() : "Ingreso";
            LocalDate fecha = parseFechaSafe(r.getFecha());

            for (Map.Entry<String, Double> e : porcentajesReparto(asignado).entrySet()) {
                String titulo = e.getKey();
                double pct    = e.getValue();
                double monto  = Math.round(total * pct / 100.0 * 100.0) / 100.0;
                if (monto <= 0) continue;

                esperadoPorDueno.merge(titulo, monto, Double::sum);

                if (ejecutar) {
                    PagoPasivo mov = new PagoPasivo();
                    mov.setMontoPagado(-monto);
                    mov.setFecha(fecha);
                    mov.setMoneda(moneda);
                    mov.setNota(fmtPctReparto(pct) + "% de " + actividad + " — " + r.getFecha()
                            + " = " + String.format(Locale.US, "%.2f", monto) + " " + moneda);
                    nuevosPorDueno.get(titulo).add(mov);
                }
            }
        }

        // ── Paso 2: por cada tarjeta, medir lo viejo y (si ejecutar) reemplazar
        List<Map<String, Object>> detalle = new ArrayList<>();
        for (String titulo : new String[]{ T_IGNA, T_JOSE, T_HANS }) {
            Pasivo pasivo = buscarTarjeta(titulo);
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("tarjeta", titulo);

            if (pasivo == null) { f.put("error", "tarjeta no encontrada"); detalle.add(f); continue; }

            double viejoReparto = 0, otros = 0;
            int nViejos = 0, nOtros = 0;
            List<Long> idsReparto = new ArrayList<>();
            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                double m = p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                if (notaEsReparto(p.getNota())) {
                    viejoReparto += m; nViejos++; idsReparto.add(p.getId());
                } else {
                    otros += m; nOtros++;
                }
            }
            double esperado = esperadoPorDueno.getOrDefault(titulo, 0.0);

            f.put("repartoViejo",      Math.round(viejoReparto * 100.0) / 100.0);
            f.put("movsRepartoViejo",  nViejos);
            f.put("repartoEsperado",   Math.round(-esperado * 100.0) / 100.0);
            f.put("otrosMovimientos",  nOtros);
            f.put("sumaOtros",         Math.round(otros * 100.0) / 100.0);
            f.put("saldoActual",       Math.round((viejoReparto + otros) * 100.0) / 100.0);
            f.put("saldoLuegoDeSync",  Math.round((otros - esperado) * 100.0) / 100.0);
            f.put("ajuste",            Math.round((( otros - esperado) - (viejoReparto + otros)) * 100.0) / 100.0);

            if (ejecutar) {
                // Borrar TODO movimiento de reparto viejo de esta tarjeta
                // (tengan o no origenIngresoId), sacándolos de la colección.
                pasivo.getHistorialPagos().removeIf(p -> idsReparto.contains(p.getId()));
                double t = 0;
                for (PagoPasivo p : pasivo.getHistorialPagos())
                    t += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                pasivo.setMontoTotal(Math.round(t * 100.0) / 100.0);
                pasivoRepository.save(pasivo);
                f.put("accion", "reparto viejo borrado");
            } else {
                f.put("movsRepartoNuevos", nuevosPorDueno.get(titulo).size());
                f.put("accion", "preview (no se modificó)");
            }
            detalle.add(f);
        }

        // Recrear el reparto ingreso por ingreso usando el servicio, que marca
        // origenIngresoId. Así, de acá en más, editar/borrar cada ingreso
        // mantiene el reparto sincronizado solo.
        int recreados = 0;
        if (ejecutar) {
            for (ClaseRegistro r : claseRepository.findAll()) {
                if (!"INGRESO".equalsIgnoreCase(r.getTipoTransaccion())) continue;
                String a = r.getAsignadoA();
                if (a == null || a.isBlank() || "NINGUNO".equalsIgnoreCase(a)) continue;
                repartoService.recalcular(r);
                recreados++;
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("modo", ejecutar ? "EJECUTADO" : "PREVIEW — agregá ?confirmar=true para aplicar");
        out.put("ingresosConsiderados", ingresosConsiderados);
        out.put("ingresosSinAsignar", sinAsignar);
        if (ejecutar) out.put("ingresosRepartidos", recreados);
        out.put("porTarjeta", detalle);
        return out;
    }

    // 5. Obtener una tarjeta por ID (con saldos por moneda)
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerPasivoPorId(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(p -> ResponseEntity.ok(enriquecerPasivo(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    // 6. RECALCULAR montoTotal de una tarjeta ────────────────────────────────
    // Suma solo los movimientos en BRL (la moneda base de la tarjeta) del
    // historial, ignorando movimientos en EUR/USD que estaban mal acumulados
    // antes del fix multi-moneda. Llamar una sola vez por tarjeta afectada.
    @Transactional
    @PostMapping("/{id}/recalcular")
    public ResponseEntity<?> recalcularMontoTotal(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    if (pasivo.getHistorialPagos() == null) {
                        return ResponseEntity.ok(enriquecerPasivo(pasivo));
                    }
                    // Todo está en reales: se suma el historial completo.
                    double total = 0;
                    for (PagoPasivo p : pasivo.getHistorialPagos()) {
                        total += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                    }
                    pasivo.setMontoTotal(Math.round(total * 100.0) / 100.0);
                    return ResponseEntity.ok(enriquecerPasivo(pasivoRepository.save(pasivo)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 6b. RECALCULAR montoTotal de TODAS las tarjetas de una sola vez.
    //     Necesario después de reexpresar montos a reales: los montoTotal
    //     guardados quedaron sin sumar los movimientos en canales EUR/USD.
    // CUIDADO: no todas las tarjetas tienen su saldo derivable del historial.
    // Las que se crearon con un monto inicial lo guardaron sólo en montoTotal,
    // sin generar un movimiento. Para esas, recalcular desde el historial
    // BORRA la deuda original. Por eso este endpoint es preview por defecto y
    // saltea las tarjetas donde detecta ese caso, salvo que se le insista.
    @Transactional
    @PostMapping("/recalcular-todos")
    public ResponseEntity<Map<String, Object>> recalcularTodos(
            @RequestParam(defaultValue = "false") boolean confirmar,
            @RequestParam(defaultValue = "true")  boolean protegerSaldoInicial) {

        List<Map<String, Object>> filas = new ArrayList<>();

        for (Pasivo pasivo : pasivoRepository.findAll()) {
            double antes = pasivo.getMontoTotal() != null ? pasivo.getMontoTotal() : 0;
            double total = 0;
            int movs = 0;
            if (pasivo.getHistorialPagos() != null) {
                for (PagoPasivo p : pasivo.getHistorialPagos()) {
                    total += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                    movs++;
                }
            }
            total = Math.round(total * 100.0) / 100.0;
            double dif = Math.round((total - antes) * 100.0) / 100.0;

            // Señal de saldo inicial no registrado: pocos movimientos y una
            // diferencia grande respecto del saldo guardado.
            boolean sospechoso = movs <= 3 && Math.abs(dif) > 0.01;

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("tarjeta",     pasivo.getTitulo());
            f.put("movimientos", movs);
            f.put("actual",      Math.round(antes * 100.0) / 100.0);
            f.put("sumaHistorial", total);
            f.put("diferencia",  dif);

            if (sospechoso && protegerSaldoInicial) {
                f.put("accion", "SALTEADA — parece tener saldo inicial fuera del historial");
                f.put("saldoInicialFaltante", Math.round((antes - total) * 100.0) / 100.0);
                f.put("comoArreglar", "POST /api/pasivos/" + pasivo.getId()
                        + "/fijar-saldo?saldo=" + Math.round(antes * 100.0) / 100.0);
            } else if (confirmar) {
                pasivo.setMontoTotal(total);
                pasivoRepository.save(pasivo);
                f.put("accion", "actualizada");
            } else {
                f.put("accion", "preview (no se modificó)");
            }
            filas.add(f);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("modo", confirmar ? "EJECUTADO" : "PREVIEW — agregá ?confirmar=true para aplicar");
        out.put("tarjetas", filas.size());
        out.put("detalle", filas);
        return ResponseEntity.ok(out);
    }

    // FIJAR SALDO — deja el saldo en el valor indicado creando el movimiento
    // que falte para llegar a él. Sirve para restaurar tarjetas cuya deuda
    // inicial nunca quedó registrada en el historial.
    @Transactional
    @PostMapping("/{id}/fijar-saldo")
    public ResponseEntity<?> fijarSaldo(
            @PathVariable Long id,
            @RequestParam double saldo,
            @RequestParam(required = false) String nota,
            @RequestParam(defaultValue = "false") boolean confirmar) {

        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    double suma = 0;
                    if (pasivo.getHistorialPagos() != null) {
                        for (PagoPasivo p : pasivo.getHistorialPagos()) {
                            suma += p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                        }
                    }
                    suma = Math.round(suma * 100.0) / 100.0;
                    double ajuste = Math.round((saldo - suma) * 100.0) / 100.0;

                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("tarjeta", pasivo.getTitulo());
                    out.put("sumaHistorial", suma);
                    out.put("saldoObjetivo", saldo);
                    out.put("movimientoAcrear", ajuste);

                    if (Math.abs(ajuste) < 0.01) {
                        out.put("accion", "nada que hacer — el historial ya da ese saldo");
                        pasivo.setMontoTotal(saldo);
                        pasivoRepository.save(pasivo);
                        return ResponseEntity.ok(out);
                    }
                    if (!confirmar) {
                        out.put("accion", "PREVIEW — agregá &confirmar=true para aplicar");
                        return ResponseEntity.ok(out);
                    }

                    PagoPasivo mov = new PagoPasivo();
                    mov.setMontoPagado(ajuste);
                    mov.setFecha(LocalDate.now());
                    mov.setMoneda("BRL");
                    mov.setNota(nota != null && !nota.isBlank()
                            ? nota
                            : "Saldo inicial (no estaba registrado en el historial)");
                    mov.setPasivo(pasivo);
                    pasivo.getHistorialPagos().add(mov);

                    pasivo.setMontoTotal(saldo);
                    pasivoRepository.save(pasivo);

                    out.put("accion", "movimiento creado — el saldo ahora sale del historial");
                    return ResponseEntity.ok(out);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 7. CORREGIR MONEDA de un PagoPasivo existente ──────────────────────────
    // Útil cuando un pago se guardó sin moneda (legacy) o con moneda incorrecta.
    // Después de corregir, llamar a /{id}/recalcular para ajustar montoTotal.
    public static class CorregirMonedaRequest {
        private String moneda;
        public String getMoneda() { return moneda; }
        public void setMoneda(String m) { moneda = m; }
    }

    @Transactional
    @PatchMapping("/{pasivoId}/historial/{pagoId}/moneda")
    public ResponseEntity<?> corregirMonedaMovimiento(
            @PathVariable Long pasivoId,
            @PathVariable Long pagoId,
            @RequestBody CorregirMonedaRequest req) {

        Pasivo pasivo = pasivoRepository.findById(pasivoId).orElse(null);
        if (pasivo == null) return ResponseEntity.notFound().build();

        PagoPasivo pago = pagoPasivoRepository.findById(pagoId).orElse(null);
        if (pago == null) return ResponseEntity.notFound().build();

        if (pago.getPasivo() == null || !pago.getPasivo().getId().equals(pasivoId))
            return ResponseEntity.badRequest().body("Ese movimiento no pertenece a esta tarjeta.");

        pago.setMoneda(req.getMoneda());
        pagoPasivoRepository.save(pago);

        return ResponseEntity.ok(enriquecerPasivo(pasivo));
    }
}