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

        // 4. Si es un EGRESO vinculado a un Pasivo, actualizamos el saldo del pasivo
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())
                && registro.getPasivoId() != null) {

            pasivoRepository.findById(registro.getPasivoId()).ifPresent(pasivo -> {

                double monto = Double.parseDouble(registro.getTotal());
                String tipo = registro.getTipoMovimientoPasivo();

                /*
                 * LÓGICA DE SALDO:
                 *
                 * ADELANTO  → el profe nos debe plata → saldo POSITIVO (a nuestro favor)
                 *             montoTotal SUMA el monto.
                 *
                 * PAGO_DEUDA → pagamos una deuda nuestra → reducimos saldo negativo
                 *              montoTotal SUMA el monto (la deuda era negativa, sumar la acerca a 0).
                 *
                 * En AMBOS casos el efecto matemático sobre montoTotal es SUMAR el monto.
                 * La diferencia semántica queda registrada en tipoMovimientoPasivo del ClaseRegistro.
                 */
                pasivo.setMontoTotal(pasivo.getMontoTotal() + monto);

                // Registrar en el historial del pasivo
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