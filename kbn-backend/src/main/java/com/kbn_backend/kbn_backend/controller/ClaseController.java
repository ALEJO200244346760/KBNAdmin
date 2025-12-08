package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.repository.ClaseRepository;
import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clases")
public class ClaseController {

    @Autowired
    private ClaseRepository claseRepository;

    // 1. GUARDAR REGISTRO (INGRESO o EGRESO)
    @PostMapping("/guardar")
    public ResponseEntity<ClaseRegistro> guardarClase(@RequestBody ClaseRegistro registro) {

        // Si es EGRESO, aseguramos que 'asignadoA' sea nulo y revisado = true
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true);
        } else {
            // INGRESO: asignadoA nunca puede estar vacío, poner "NINGUNO" si no hay valor
            if (registro.getAsignadoA() == null || registro.getAsignadoA().trim().isEmpty()) {
                registro.setAsignadoA("NINGUNO");
            }
            registro.setRevisado(false); // INGRESO pendiente de revisión
        }

        // Ahora guardamos la fecha como String (ya no LocalDate)
        // No se necesita parseo, solo asegurarse que venga en formato "yyyy-MM-dd"

        ClaseRegistro savedRegistro = claseRepository.save(registro);
        return ResponseEntity.ok(savedRegistro);
    }

    // 2. LISTAR CLASES (Para Admin Dashboard)
    @GetMapping("/listar")
    public ResponseEntity<List<ClaseRegistro>> listarClases() {
        return ResponseEntity.ok(claseRepository.findAllByOrderByFechaDesc());
    }

    // 3. ASIGNAR INGRESO (Acción del Admin)
    @PutMapping("/asignar/{id}")
    public ResponseEntity<?> asignarIngreso(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String asignadoA = payload.get("asignadoA");

        return claseRepository.findById(id)
                .map(registro -> {
                    if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
                        return ResponseEntity.badRequest().body("No se puede asignar ingreso a una transacción de EGRESO.");
                    }
                    registro.setRevisado(true);
                    claseRepository.save(registro);
                    return ResponseEntity.ok("Asignación actualizada correctamente");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. GENERAR REPORTE
    @GetMapping("/reporte")
    public ResponseEntity<ReporteKiteDTO> generarReporte(
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {

        // Llamamos al repositorio con Strings, ya que la fecha ahora es String
        Optional<ReporteKiteDTO> reporte = claseRepository.getReporteEntreFechas(fechaInicio, fechaFin);

        return reporte.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
