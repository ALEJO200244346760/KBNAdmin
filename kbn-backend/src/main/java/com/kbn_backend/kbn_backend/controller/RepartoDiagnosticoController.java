package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.model.PagoPasivo;
import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * DIAGNÓSTICO DE REPARTOS — SOLO LECTURA.
 *
 * No modifica absolutamente nada. Sirve para ver, antes de corregir, cuánto
 * difiere el reparto que está cargado en las tarjetas de dueños respecto del
 * que correspondería según los montos actuales de los ingresos.
 *
 * Contexto: los montos de los ingresos en EUR/USD fueron reexpresados en
 * reales, pero los movimientos de reparto ya acumulados quedaron con los
 * valores viejos.
 */
@RestController
@RequestMapping("/api/diagnostico")
public class RepartoDiagnosticoController {

    @Autowired private ClaseRepository claseRepository;
    @Autowired private PasivoRepository pasivoRepository;

    private static final String TITULO_JOSE = "José Sánchez";
    private static final String TITULO_IGNA = "Igna Krebs";
    private static final String TITULO_HANS = "Hans Leonhard Wurbs";

    // Una nota de reparto arranca con "<pct>% de ..."
    private static final Pattern NOTA_REPARTO = Pattern.compile("^\\s*(\\d+(?:[.,]\\d+)?)\\s*%\\s+de\\s+");

    private boolean esMovimientoDeReparto(PagoPasivo p) {
        return p != null && p.getNota() != null && NOTA_REPARTO.matcher(p.getNota()).find();
    }

    /** Porcentaje que le toca a cada dueño según la asignación del ingreso. */
    private Map<String, Double> porcentajes(String asignadoA) {
        double pIgna, pJose;
        String a = asignadoA == null ? "" : asignadoA.trim().toUpperCase();
        switch (a) {
            case "IGNA":  pIgna = 16;   pJose = 8;    break;
            case "JOSE":  pIgna = 8;    pJose = 16;   break;
            case "AMBOS": pIgna = 12.5; pJose = 12.5; break;
            default:      pIgna = 10;   pJose = 10;   break;
        }
        Map<String, Double> m = new LinkedHashMap<>();
        m.put(TITULO_IGNA, pIgna);
        m.put(TITULO_JOSE, pJose);
        m.put(TITULO_HANS, 5.0);
        return m;
    }

    private double num(String s) {
        if (s == null || s.isBlank()) return 0;
        try { return Double.parseDouble(s.trim().replace(",", ".")); }
        catch (Exception e) { return 0; }
    }

    private double r2(double d) { return Math.round(d * 100.0) / 100.0; }

    /**
     * GET /api/diagnostico/repartos
     *
     * Compara, por tarjeta de dueño:
     *   - lo que hay cargado hoy como reparto
     *   - lo que debería haber según los montos actuales de los ingresos
     *
     * Opcional: ?desde=2026-08-01&hasta=2026-08-31
     */
    @GetMapping("/repartos")
    public ResponseEntity<Map<String, Object>> diagnostico(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {

        // ── 1. Lo esperado, a partir de los ingresos actuales ────────────────
        Map<String, Double> esperado = new LinkedHashMap<>();
        esperado.put(TITULO_IGNA, 0.0);
        esperado.put(TITULO_JOSE, 0.0);
        esperado.put(TITULO_HANS, 0.0);

        int ingresosContados = 0, sinAsignar = 0;
        List<Map<String, Object>> muestraIngresos = new ArrayList<>();

        for (ClaseRegistro r : claseRepository.findAll()) {
            if (!"INGRESO".equalsIgnoreCase(r.getTipoTransaccion())) continue;
            String f = r.getFecha();
            if (f == null || f.isBlank()) continue;
            if (desde != null && !desde.isBlank() && f.compareTo(desde) < 0) continue;
            if (hasta != null && !hasta.isBlank() && f.compareTo(hasta) > 0) continue;

            String asignado = r.getAsignadoA();
            boolean ok = asignado != null && !asignado.isBlank() && !"NINGUNO".equalsIgnoreCase(asignado);
            if (!ok) { sinAsignar++; continue; }

            double total = num(r.getTotal());
            if (total <= 0) continue;
            ingresosContados++;

            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("ingresoId", r.getId());
            fila.put("fecha", f);
            fila.put("actividad", r.getActividad());
            fila.put("total", total);
            fila.put("moneda", r.getMoneda());
            fila.put("asignadoA", asignado);

            Map<String, Object> repartoEsperado = new LinkedHashMap<>();
            for (Map.Entry<String, Double> e : porcentajes(asignado).entrySet()) {
                double monto = r2(total * e.getValue() / 100.0);
                esperado.merge(e.getKey(), monto, Double::sum);
                repartoEsperado.put(e.getKey(), monto);
            }
            fila.put("repartoEsperado", repartoEsperado);
            if (muestraIngresos.size() < 40) muestraIngresos.add(fila);
        }

        // ── 2. Lo que hay cargado hoy en cada tarjeta ────────────────────────
        List<Map<String, Object>> porTarjeta = new ArrayList<>();
        double difTotal = 0;

        for (String titulo : new String[]{ TITULO_IGNA, TITULO_JOSE, TITULO_HANS }) {
            Pasivo pasivo = null;
            for (Pasivo p : pasivoRepository.findAll()) {
                if (p.getTitulo() != null && p.getTitulo().trim().equalsIgnoreCase(titulo)) { pasivo = p; break; }
            }

            Map<String, Object> t = new LinkedHashMap<>();
            t.put("tarjeta", titulo);

            if (pasivo == null) {
                t.put("error", "tarjeta no encontrada");
                porTarjeta.add(t);
                continue;
            }

            double sumaRepartos = 0, sumaOtros = 0;
            int nRepartos = 0, nOtros = 0;
            Map<String, Double> porCanal = new LinkedHashMap<>();

            for (PagoPasivo p : pasivo.getHistorialPagos()) {
                double m = p.getMontoPagado() != null ? p.getMontoPagado() : 0;
                if (esMovimientoDeReparto(p)) {
                    sumaRepartos += Math.abs(m);
                    nRepartos++;
                    String canal = p.getMoneda() != null && !p.getMoneda().isBlank() ? p.getMoneda() : "(sin canal)";
                    porCanal.merge(canal, Math.abs(m), Double::sum);
                } else {
                    sumaOtros += m;
                    nOtros++;
                }
            }

            double esp = esperado.getOrDefault(titulo, 0.0);
            double dif = r2(sumaRepartos - esp);
            difTotal += dif;

            t.put("movimientosDeReparto", nRepartos);
            t.put("repartoCargadoHoy",    r2(sumaRepartos));
            t.put("repartoEsperado",      r2(esp));
            t.put("diferencia",           dif);
            t.put("repartoPorCanal",      porCanal);
            t.put("otrosMovimientos",     nOtros);
            t.put("sumaOtrosMovimientos", r2(sumaOtros));
            t.put("nota", "otros = pagos, adelantos y liquidaciones de clase (no se tocarían)");
            porTarjeta.add(t);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("soloLectura", true);
        out.put("desde", desde);
        out.put("hasta", hasta);
        out.put("ingresosConsiderados", ingresosContados);
        out.put("ingresosSinAsignar", sinAsignar);
        out.put("porTarjeta", porTarjeta);
        out.put("diferenciaTotal", r2(difTotal));
        out.put("muestraIngresos", muestraIngresos);
        return ResponseEntity.ok(out);
    }

    /**
     * GET /api/diagnostico/monedas
     *
     * Resumen de en qué canal está cargado cada ingreso y por cuánto.
     * Sirve para confirmar que los montos en EUR/USD ya están expresados
     * en reales.
     */
    @GetMapping("/monedas")
    public ResponseEntity<Map<String, Object>> monedas() {
        Map<String, Integer> conteo = new LinkedHashMap<>();
        Map<String, Double>  suma   = new LinkedHashMap<>();
        Map<String, Double>  maximo = new LinkedHashMap<>();

        for (ClaseRegistro r : claseRepository.findAll()) {
            if (!"INGRESO".equalsIgnoreCase(r.getTipoTransaccion())) continue;
            String canal = r.getMoneda() != null && !r.getMoneda().isBlank() ? r.getMoneda() : "(sin canal)";
            double t = num(r.getTotal());
            conteo.merge(canal, 1, Integer::sum);
            suma.merge(canal, t, Double::sum);
            maximo.merge(canal, t, Math::max);
        }

        List<Map<String, Object>> filas = new ArrayList<>();
        for (String canal : conteo.keySet()) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("canal", canal);
            f.put("ingresos", conteo.get(canal));
            f.put("sumaTotal", r2(suma.getOrDefault(canal, 0.0)));
            f.put("montoMasAlto", r2(maximo.getOrDefault(canal, 0.0)));
            f.put("promedio", conteo.get(canal) > 0 ? r2(suma.get(canal) / conteo.get(canal)) : 0);
            filas.add(f);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("soloLectura", true);
        out.put("ayuda", "Si el promedio de los canales EUR/USD es parecido al de los BRL, "
                       + "confirma que los montos ya están expresados en reales.");
        out.put("porCanal", filas);
        return ResponseEntity.ok(out);
    }
}