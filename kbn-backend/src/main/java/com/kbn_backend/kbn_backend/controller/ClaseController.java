package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.dto.ReporteKiteDTO;
import com.kbn_backend.kbn_backend.model.ClaseRegistro;
import com.kbn_backend.kbn_backend.repository.ClaseRepository; // Asumo que ya creaste la interfaz Repository
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
@CrossOrigin("*") // Ajustar según seguridad
public class ClaseController {

    @Autowired
    private ClaseRepository claseRepository;

    @PostMapping("/guardar")
    public ResponseEntity<?> crearRegistro(@RequestBody ClaseRegistro registro) {
        // Validaciones básicas de backend
        if (registro.getFecha() == null) {
            registro.setFecha(LocalDate.now());
        }

        // Calcular total en backend por seguridad (aunque el front lo haga)
        if(registro.getCantidadHoras() != null && registro.getTarifaPorHora() != null){
            registro.setTotal(registro.getCantidadHoras() * registro.getTarifaPorHora());
        }

        // Aseguramos que los campos de Admin estén vacíos al crear
        registro.setAsignadoA(null);
        registro.setRevisado(false);

        ClaseRegistro nuevoRegistro = claseRepository.save(registro);
        return ResponseEntity.ok(nuevoRegistro);
    }

    // 1. Obtener todas las clases (podrías agregar paginación después)
    @GetMapping("/listar")
    public ResponseEntity<List<ClaseRegistro>> listarClases() {
        // Sugerencia: Ordenar por fecha descendente para ver lo más nuevo arriba
        // return ResponseEntity.ok(claseRepository.findAllByOrderByFechaDesc());
        // Por ahora usamos findAll simple:
        return ResponseEntity.ok(claseRepository.findAll());
    }

    // 2. Asignar quién recibe el dinero (Igna/Jose)
    @PutMapping("/asignar/{id}")
    public ResponseEntity<?> asignarIngreso(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String asignadoA = payload.get("asignadoA"); // Esperamos "IGNA", "JOSE", "NINGUNO"

        return claseRepository.findById(id)
                .map(registro -> {
                    registro.setAsignadoA(asignadoA);
                    registro.setRevisado(true); // Marcamos como revisado
                    claseRepository.save(registro);
                    return ResponseEntity.ok("Asignación actualizada correctamente");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reporte")
    public ResponseEntity<?> generarReporte(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        Optional<ReporteKiteDTO> reporte = claseRepository.getReporteEntreFechas(fechaInicio, fechaFin);

        if (reporte.isPresent()) {
            return ResponseEntity.ok(reporte.get());
        } else {
            // Devolvemos el objeto con ceros si no hay datos, o un mensaje claro
            return ResponseEntity.notFound().build();
        }
    }
}
