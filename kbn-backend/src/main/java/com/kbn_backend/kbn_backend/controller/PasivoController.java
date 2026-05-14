package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Pasivo;
import com.kbn_backend.kbn_backend.repository.PasivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pasivos")
public class PasivoController {

    @Autowired
    private PasivoRepository pasivoRepository;

    // 1. Obtener todas las cuentas corrientes
    @GetMapping
    public ResponseEntity<List<Pasivo>> listarPasivos() {
        return ResponseEntity.ok(pasivoRepository.findAll());
    }

    // 2. Crear un nuevo pasivo (Deuda o Adelanto inicial)
    @PostMapping
    public ResponseEntity<Pasivo> crearPasivo(@RequestBody Pasivo pasivo) {
        return ResponseEntity.ok(pasivoRepository.save(pasivo));
    }

    // 3. Actualizar un pasivo (Para editar nombre/descripción o actualizar saldo)
    @PutMapping("/{id}")
    public ResponseEntity<Pasivo> actualizarPasivo(@PathVariable Long id, @RequestBody Pasivo detallesPasivo) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    pasivo.setTitulo(detallesPasivo.getTitulo());
                    pasivo.setDescripcion(detallesPasivo.getDescripcion());
                    pasivo.setMontoTotal(detallesPasivo.getMontoTotal());
                    pasivo.setMoneda(detallesPasivo.getMoneda());
                    pasivo.setFecha(detallesPasivo.getFecha());
                    // Si tienes historialPagos como relación, asegúrate de manejarlo aquí si es necesario
                    Pasivo actualizado = pasivoRepository.save(pasivo);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Eliminar una cuenta corriente
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPasivo(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(pasivo -> {
                    pasivoRepository.delete(pasivo);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 5. Obtener un pasivo específico (útil para ver detalles o historial)
    @GetMapping("/{id}")
    public ResponseEntity<Pasivo> obtenerPasivoPorId(@PathVariable Long id) {
        return pasivoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}