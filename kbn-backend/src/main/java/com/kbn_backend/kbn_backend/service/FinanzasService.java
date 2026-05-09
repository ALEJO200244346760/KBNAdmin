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

    @Transactional
    public ClaseRegistro guardarTransaccion(ClaseRegistro registro) {
        // 1. Lógica de inicialización según tipo
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(false);
        } else if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true);
        }

        // 2. Cálculo de seguridad del Total
        if (registro.getTotal() == null && registro.getCantidadHoras() != null && registro.getTarifaPorHora() != null) {
            try {
                double h = Double.parseDouble(registro.getCantidadHoras());
                double t = Double.parseDouble(registro.getTarifaPorHora());
                registro.setTotal(String.valueOf(h * t));
            } catch (Exception e) { registro.setTotal("0"); }
        }

        // 3. Guardar el movimiento en caja
        ClaseRegistro saved = claseRepository.save(registro);

        // 4. Si es un Egreso vinculado a un Pasivo, actualizamos la deuda
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion()) && registro.getPasivoId() != null) {
            pasivoRepository.findById(registro.getPasivoId()).ifPresent(pasivo -> {
                Double montoPagado = Double.valueOf(registro.getTotal());

                // Restar del saldo (puede quedar negativo si es adelanto)
                pasivo.setMontoTotal(pasivo.getMontoTotal() - montoPagado);

                // Crear registro en el historial
                PagoPasivo pagoHistorial = new PagoPasivo();
                pagoHistorial.setMontoPagado(montoPagado);
                pagoHistorial.setFecha(LocalDate.now());
                pagoHistorial.setNota(registro.getDetalles() != null ? registro.getDetalles() : "Pago registrado");
                pagoHistorial.setPasivo(pasivo);

                pagoPasivoRepository.save(pagoHistorial);
                pasivoRepository.save(pasivo);
            });
        }
        return saved;
    }
}