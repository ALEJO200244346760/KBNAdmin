package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Ubicacion;
import com.kbn_backend.kbn_backend.repository.UbicacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/ubicaciones")
public class UbicacionController {

    @Autowired
    private UbicacionRepository ubicacionRepository;

    @GetMapping
    public List<Ubicacion> getAllUbicaciones() {
        return ubicacionRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // Devuelve un 201 Created
    public Ubicacion createUbicacion(@RequestBody Ubicacion ubicacion) {
        return ubicacionRepository.save(ubicacion);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT) // Devuelve un 204 No Content
    public void deleteUbicacion(@PathVariable Long id) {
        ubicacionRepository.deleteById(id);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Ubicacion> updateUbicacion(@PathVariable Long id, @RequestBody Ubicacion updatedUbicacion) {
        return ubicacionRepository.findById(id)
                .map(ubicacion -> {
                    ubicacion.setNombre(updatedUbicacion.getNombre()); // Asegúrate de que el modelo tenga este método
                    Ubicacion updated = ubicacionRepository.save(ubicacion);
                    return ResponseEntity.ok(updated);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build()); // Devuelve 404 si no se encuentra
    }
}
