package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Agenda;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.AgendaRepository;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/agenda")
@CrossOrigin(origins = "*") // Ajusta según seguridad
public class AgendaController {

    @Autowired
    private AgendaRepository agendaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    // 1. Crear nueva cita (Secretaria)
    @PostMapping("/crear")
    public ResponseEntity<?> crearAgenda(@RequestBody Agenda agenda) {
        try {
            // Buscamos el nombre del instructor para guardarlo también
            Optional<Usuario> instructor = usuarioRepository.findById(agenda.getInstructorId());
            if (instructor.isPresent()) {
                agenda.setNombreInstructor(instructor.get().getNombre() + " " + instructor.get().getApellido());
            }

            agenda.setEstado("PENDIENTE"); // Estado inicial
            Agenda nuevaAgenda = agendaRepository.save(agenda);
            return ResponseEntity.ok(nuevaAgenda);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al crear agenda: " + e.getMessage());
        }
    }

    // 2. Listar todas (Para Secretaria o Admin)
    @GetMapping("/listar")
    public List<Agenda> listarTodas() {
        return agendaRepository.findAll();
    }

    // 3. Listar por Instructor (Para que el instructor vea SUS clases)
    @GetMapping("/instructor/{id}")
    public List<Agenda> listarPorInstructor(@PathVariable Long id) {
        return agendaRepository.findByInstructorId(id);
    }

    // 4. Cambiar Estado (Confirmar/Rechazar por Instructor)
    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody String nuevoEstado) {
        // El body vendrá simple como "CONFIRMADA" o un objeto JSON { "estado": "CONFIRMADA" }
        // Simplificamos asumiendo que envías un mapa o string limpio.
        // Lo ideal es recibir un Map<String, String> payload

        return agendaRepository.findById(id).map(agenda -> {
            // Limpieza básica del string si llega con comillas extra
            String estadoLimpio = nuevoEstado.replace("\"", "").replace("}", "").replace("{", "").replace("estado:", "").trim();

            agenda.setEstado(estadoLimpio);
            agendaRepository.save(agenda);
            return ResponseEntity.ok("Estado actualizado a " + estadoLimpio);
        }).orElse(ResponseEntity.notFound().build());
    }
}