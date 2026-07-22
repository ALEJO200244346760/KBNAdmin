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

    // 5. Actualizar campos de la clase (tipoAula, horaSalida, horas, lugar, etc.)
    public static class ActualizarClaseRequest {
        private String tipoAula;
        private String horaSalida;
        private Double horas;
        private String lugar;
        private String hotelDerivacion;
        private Double tarifa;
        private Double horasPagadas;
        private String estado;

        public String getTipoAula() { return tipoAula; }
        public void setTipoAula(String tipoAula) { this.tipoAula = tipoAula; }
        public String getHoraSalida() { return horaSalida; }
        public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }
        public Double getHoras() { return horas; }
        public void setHoras(Double horas) { this.horas = horas; }
        public String getLugar() { return lugar; }
        public void setLugar(String lugar) { this.lugar = lugar; }
        public String getHotelDerivacion() { return hotelDerivacion; }
        public void setHotelDerivacion(String hotelDerivacion) { this.hotelDerivacion = hotelDerivacion; }
        public Double getTarifa() { return tarifa; }
        public void setTarifa(Double tarifa) { this.tarifa = tarifa; }
        public Double getHorasPagadas() { return horasPagadas; }
        public void setHorasPagadas(Double horasPagadas) { this.horasPagadas = horasPagadas; }
        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> actualizarClase(
            @PathVariable Long id,
            @RequestBody ActualizarClaseRequest req
    ) {
        return agendaRepository.findById(id).map(agenda -> {
            if (req.getTipoAula()         != null) agenda.setTipoAula(req.getTipoAula());
            if (req.getHoraSalida()       != null) {
                try {
                    agenda.setHoraSalida(java.time.LocalTime.parse(req.getHoraSalida()));
                } catch (Exception ignored) {}
            }
            if (req.getHoras()            != null) agenda.setHoras(req.getHoras());
            if (req.getLugar()            != null) agenda.setLugar(req.getLugar());
            if (req.getHotelDerivacion()  != null) agenda.setHotelDerivacion(req.getHotelDerivacion());
            if (req.getTarifa()           != null) agenda.setTarifa(req.getTarifa());
            if (req.getHorasPagadas()     != null) agenda.setHorasPagadas(req.getHorasPagadas());
            if (req.getEstado()           != null) agenda.setEstado(req.getEstado());
            return ResponseEntity.ok(agendaRepository.save(agenda));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 6. Marcar clase(s) como cobradas — llamado al registrar un ingreso vinculado
    public static class CobrarRequest {
        private Long ingresoId;
        private java.util.List<Long> agendaIds;
        public Long getIngresoId() { return ingresoId; }
        public void setIngresoId(Long ingresoId) { this.ingresoId = ingresoId; }
        public java.util.List<Long> getAgendaIds() { return agendaIds; }
        public void setAgendaIds(java.util.List<Long> agendaIds) { this.agendaIds = agendaIds; }
    }

    @PostMapping("/cobrar")
    public ResponseEntity<?> marcarCobradas(@RequestBody CobrarRequest req) {
        if (req.getAgendaIds() == null || req.getAgendaIds().isEmpty()) {
            return ResponseEntity.badRequest().body("agendaIds requerido");
        }
        req.getAgendaIds().forEach(aid ->
            agendaRepository.findById(aid).ifPresent(a -> {
                a.setCobrada(true);
                a.setIngresoId(req.getIngresoId());
                agendaRepository.save(a);
            })
        );
        return ResponseEntity.ok("Clases marcadas como cobradas");
    }

}