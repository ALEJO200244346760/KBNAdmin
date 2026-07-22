package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.*;
import com.kbn_backend.kbn_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
public class FinanzasService {

    @Autowired
    private ClaseRepository claseRepository;
    @Autowired
    private PasivoRepository pasivoRepository;
    @Autowired
    private PagoPasivoRepository pagoPasivoRepository;
    @Autowired
    private AgendaRepository agendaRepository;

    @Transactional
    public ClaseRegistro guardarTransaccion(ClaseRegistro registro) {

        // 1. Inicialización según tipo de transacción
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(false);
        } else if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true);
        }

        // 2. Cálculo automático del total si no viene explícito
        if (registro.getTotal() == null
                && registro.getCantidadHoras() != null
                && registro.getTarifaPorHora() != null) {
            try {
                double h = Double.parseDouble(registro.getCantidadHoras());
                double t = Double.parseDouble(registro.getTarifaPorHora());
                registro.setTotal(String.valueOf(h * t));
            } catch (Exception e) {
                registro.setTotal("0");
            }
        }

        // 3. Guardar el movimiento en caja
        ClaseRegistro saved = claseRepository.save(registro);

        // 4. Si es un INGRESO con agendaIds, marcar esas clases como cobradas
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())
                && registro.getAgendaIds() != null
                && !registro.getAgendaIds().isBlank()) {
            try {
                String[] ids = registro.getAgendaIds().split(",");
                for (String idStr : ids) {
                    long agendaId = Long.parseLong(idStr.trim());
                    agendaRepository.findById(agendaId).ifPresent(a -> {
                        a.setCobrada(true);
                        a.setIngresoId(saved.getId());
                        agendaRepository.save(a);
                    });
                }
            } catch (Exception e) {
                // IDs malformados — no bloquear el guardado del ingreso
                System.err.println("FinanzasService: error parseando agendaIds: " + e.getMessage());
            }
        }

        // 5. Si es un EGRESO vinculado a un Pasivo, actualizamos el saldo del pasivo
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())
                && registro.getPasivoId() != null) {

            pasivoRepository.findById(registro.getPasivoId()).ifPresent(pasivo -> {

                double monto = Double.parseDouble(registro.getTotal());
                String tipo = registro.getTipoMovimientoPasivo();

                pasivo.setMontoTotal(pasivo.getMontoTotal() + monto);

                PagoPasivo pagoHistorial = new PagoPasivo();
                pagoHistorial.setMontoPagado(monto);
                pagoHistorial.setFecha(LocalDate.now());
                pagoHistorial.setNota(
                        registro.getDetalles() != null ? registro.getDetalles() : "Pago registrado"
                );
                pagoHistorial.setPasivo(pasivo);

                pagoPasivoRepository.save(pagoHistorial);
                pasivoRepository.save(pasivo);
            });
        }

        return saved;
    }
}