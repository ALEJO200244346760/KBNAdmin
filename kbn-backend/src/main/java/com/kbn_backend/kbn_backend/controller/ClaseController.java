package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/clases")
public class ClaseController {

    @Autowired
    private ClaseRepository claseRepository;

    // --- DTO INTERNO PARA ASEGURAR EL MAPEO DEL JSON ---
    public static class AsignacionRequest {
        private String asignadoA;

        // Getters y Setters necesarios
        public String getAsignadoA() { return asignadoA; }
        public void setAsignadoA(String asignadoA) { this.asignadoA = asignadoA; }
    }
    // --------------------------------------------------

    // 1. GUARDAR REGISTRO
    @PostMapping("/guardar")
    public ResponseEntity<ClaseRegistro> guardarClase(@RequestBody ClaseRegistro registro) {
        if ("INGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(false);
        }
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true);
        }

        // Calculo de seguridad por si viene nulo
        if (registro.getTotal() == null && registro.getCantidadHoras() != null && registro.getTarifaPorHora() != null) {
            // Convertir Strings a Double si es necesario, asumiendo que en tu modelo son Strings
            try {
                double h = Double.parseDouble(registro.getCantidadHoras());
                double t = Double.parseDouble(registro.getTarifaPorHora());
                registro.setTotal(String.valueOf(h * t));
            } catch (Exception e) {
                registro.setTotal("0");
            }
        }

        ClaseRegistro savedRegistro = claseRepository.save(registro);
        return ResponseEntity.ok(savedRegistro);
    }

    // 2. LISTAR CLASES
    @GetMapping("/listar")
    public ResponseEntity<List<ClaseRegistro>> listarClases() {
        return ResponseEntity.ok(claseRepository.findAllByOrderByFechaDesc());
    }

    // 3. ASIGNAR INGRESO (CORREGIDO CON DTO)
    @PutMapping("/asignar/{id}")
    public ResponseEntity<?> asignarIngreso(@PathVariable Long id, @RequestBody AsignacionRequest request) {

        // Debug en consola para verificar qué llega
        System.out.println("Solicitud de asignación recibida para ID: " + id + " - Valor: " + request.getAsignadoA());

        String nuevoValor = request.getAsignadoA();

        return claseRepository.findById(id)
                .map(registro -> {
                    if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
                        return ResponseEntity.badRequest().body("No se puede asignar ingreso a una transacción de EGRESO.");
                    }

                    registro.setAsignadoA(nuevoValor); // Asignamos el valor del DTO
                    registro.setRevisado(true);

                    claseRepository.save(registro);
                    return ResponseEntity.ok("Asignación actualizada correctamente a: " + nuevoValor);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. GENERAR REPORTE
    @GetMapping("/reporte")
    public ResponseEntity<ReporteKiteDTO> generarReporte(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        Optional<ReporteKiteDTO> reporte = claseRepository.getReporteEntreFechas(fechaInicio, fechaFin);

        if (reporte.isPresent()) {
            return ResponseEntity.ok(reporte.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}