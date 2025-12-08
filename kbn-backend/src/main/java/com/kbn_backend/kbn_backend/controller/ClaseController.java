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
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clases")
// @CrossOrigin(origins = "http://localhost:3000") // Descomentar si usas un puerto diferente
public class ClaseController {

    @Autowired
    private ClaseRepository claseRepository;

    // 1. GUARDAR REGISTRO (INGRESO o EGRESO)
    @PostMapping("/guardar")
    public ResponseEntity<ClaseRegistro> guardarClase(@RequestBody ClaseRegistro registro) {
        // En un registro de INGRESO, 'asignadoA' debe ser null/vacío para que el Admin lo revise.
        // En un registro de EGRESO, 'asignadoA' debe ser nulo.

        // Si es EGRESO, aseguramos que 'asignadoA' sea nulo
        if ("EGRESO".equalsIgnoreCase(registro.getTipoTransaccion())) {
            registro.setAsignadoA(null);
            registro.setRevisado(true); // Opcional: considerar egresos como revisados automáticamente
        }

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
                    registro.setAsignadoA(asignadoA);
                    registro.setRevisado(true);
                    claseRepository.save(registro);
                    return ResponseEntity.ok("Asignación actualizada correctamente");
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