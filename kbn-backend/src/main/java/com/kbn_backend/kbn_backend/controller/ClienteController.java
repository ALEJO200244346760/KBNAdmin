package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Cliente;
import com.kbn_backend.kbn_backend.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private ClienteRepository clienteRepository;

    // GET /api/clientes — lista todos, más recientes primero
    @GetMapping
    public ResponseEntity<List<Cliente>> listar() {
        return ResponseEntity.ok(clienteRepository.findAllByOrderByFechaRegistroDesc());
    }

    // GET /api/clientes/buscar?q=juan — búsqueda por nombre/apellido/email
    @GetMapping("/buscar")
    public ResponseEntity<List<Cliente>> buscar(@RequestParam String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(clienteRepository.findAllByOrderByFechaRegistroDesc());
        }
        return ResponseEntity.ok(clienteRepository.buscar(q.trim()));
    }

    // GET /api/clientes/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Cliente> obtener(@PathVariable Long id) {
        return clienteRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/clientes — crear
    @PostMapping
    public ResponseEntity<Cliente> crear(@RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteRepository.save(cliente));
    }

    // PUT /api/clientes/{id} — actualizar
    @PutMapping("/{id}")
    public ResponseEntity<Cliente> actualizar(@PathVariable Long id, @RequestBody Cliente datos) {
        return clienteRepository.findById(id)
                .map(c -> {
                    c.setNombre(datos.getNombre());
                    c.setApellido(datos.getApellido());
                    c.setEmail(datos.getEmail());
                    c.setTelefono(datos.getTelefono());
                    c.setNacionalidad(datos.getNacionalidad());
                    c.setEsNino(datos.isEsNino());
                    c.setNombrePadre(datos.getNombrePadre());
                    c.setApellidoPadre(datos.getApellidoPadre());
                    c.setEmailPadre(datos.getEmailPadre());
                    c.setTelefonoPadre(datos.getTelefonoPadre());
                    c.setNotas(datos.getNotas());
                    return ResponseEntity.ok(clienteRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/clientes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        return clienteRepository.findById(id)
                .map(c -> {
                    clienteRepository.delete(c);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}