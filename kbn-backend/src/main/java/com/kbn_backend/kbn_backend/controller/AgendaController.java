package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Agenda;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.AgendaRepository;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.kbn_backend.kbn_backend.service.PushNotificationService;


import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "https://kbn-admin.vercel.app", allowCredentials = "true")
@RequestMapping("/api/agenda")
public class AgendaController {

    @Autowired
    private AgendaRepository agendaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PushNotificationService pushService;

    // 1. Crear nueva cita (Secretaria)
    @PostMapping("/crear")
    public ResponseEntity<?> crearAgenda(@RequestBody Agenda agenda) {
        try {
            Optional<Usuario> instructorOpt = usuarioRepository.findById(agenda.getInstructorId());

            if (instructorOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Instructor no encontrado");
            }

            Usuario instructor = instructorOpt.get();
            agenda.setNombreInstructor(instructor.getNombre() + " " + instructor.getApellido());
            agenda.setEstado("PENDIENTE");

            Agenda nuevaAgenda = agendaRepository.save(agenda);

            // Push DESPUÉS del save, con los datos completos
            String titulo = "📅 Nueva clase asignada";
            String cuerpo = String.format(
                    "%s — %s a las %s hs en %s",
                    nuevaAgenda.getAlumno(),
                    nuevaAgenda.getFecha().toString(),
                    nuevaAgenda.getHora() != null ? nuevaAgenda.getHora().toString().substring(0, 5) : "??",
                    nuevaAgenda.getLugar() != null ? nuevaAgenda.getLugar() : "Sin lugar"
            );
            pushService.enviarNotificacion(nuevaAgenda.getInstructorId(), titulo, cuerpo, "/#/instructor");

            return ResponseEntity.ok(nuevaAgenda);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error al crear agenda: " + e.getMessage());
        }
    }

    // 2. Listar todas (Secretaria / Admin)
    @GetMapping("/listar")
    public List<Agenda> listarTodas() {
        return agendaRepository.findAll();
    }

    // 3. Listar por Instructor
    @GetMapping("/instructor/{id}")
    public List<Agenda> listarPorInstructor(@PathVariable Long id) {
        return agendaRepository.findByInstructorId(id);
    }

    // 4. Cambiar estado
    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(
            @PathVariable Long id,
            @RequestBody String nuevoEstado
    ) {
        return agendaRepository.findById(id).map(agenda -> {

            String estadoLimpio = nuevoEstado
                    .replace("\"", "")
                    .replace("{", "")
                    .replace("}", "")
                    .replace("estado:", "")
                    .trim();

            agenda.setEstado(estadoLimpio);
            agendaRepository.save(agenda);

            return ResponseEntity.ok("Estado actualizado a " + estadoLimpio);

        }).orElse(ResponseEntity.notFound().build());
    }

}