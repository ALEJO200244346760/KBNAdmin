package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Presencia;
import com.kbn_backend.kbn_backend.repository.PresenciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;

@RestController
@RequestMapping("/api/presencia")
public class PresenciaController {

    @Autowired
    private PresenciaRepository presenciaRepository;

    // DTO de request
    public static class PresenciaRequest {
        private String presentes;      // JOSE | IGNA | AMBOS | AUSENTES
        private String modificadoPor;  // nombre del usuario que lo cambia

        public String getPresentes()     { return presentes; }
        public String getModificadoPor() { return modificadoPor; }
        public void setPresentes(String p)     { this.presentes = p; }
        public void setModificadoPor(String m) { this.modificadoPor = m; }
    }

    // GET /api/presencia/hoy — devuelve el estado actual
    // Si no hay registro de hoy, usa el último conocido (no resetea a AUSENTES)
    @GetMapping("/hoy")
    public ResponseEntity<Presencia> getHoy() {
        LocalDate hoy = LocalDate.now();

        // Buscar registro de hoy
        Optional<Presencia> hoyOpt = presenciaRepository.findByFecha(hoy);
        if (hoyOpt.isPresent()) {
            return ResponseEntity.ok(hoyOpt.get());
        }

        // No hay registro de hoy → copiar el último conocido
        Optional<Presencia> ultimoOpt = presenciaRepository.findTopByOrderByFechaDesc();
        String presentes = ultimoOpt.map(Presencia::getPresentes).orElse("AUSENTES");

        // Crear registro de hoy con el valor persistido
        Presencia nueva = new Presencia();
        nueva.setFecha(hoy);
        nueva.setPresentes(presentes);
        nueva.setModificadoPor(ultimoOpt.map(Presencia::getModificadoPor).orElse(null));
        return ResponseEntity.ok(presenciaRepository.save(nueva));
    }

    // GET /api/presencia/{fecha} — estado de una fecha específica (yyyy-MM-dd)
    @GetMapping("/{fecha}")
    public ResponseEntity<Presencia> getPorFecha(@PathVariable String fecha) {
        LocalDate ld = LocalDate.parse(fecha);
        Presencia p = presenciaRepository.findByFecha(ld)
                .orElseGet(() -> {
                    Presencia nueva = new Presencia();
                    nueva.setFecha(ld);
                    nueva.setPresentes("AUSENTES");
                    return presenciaRepository.save(nueva);
                });
        return ResponseEntity.ok(p);
    }

    // PUT /api/presencia/hoy — actualiza quién está presente hoy
    // Solo ADMINISTRADOR y SECRETARIA deberían llamar esto (validado en frontend por rol)
    @PutMapping("/hoy")
    public ResponseEntity<Presencia> setHoy(@RequestBody PresenciaRequest req) {
        LocalDate hoy = LocalDate.now();
        Presencia p = presenciaRepository.findByFecha(hoy)
                .orElseGet(() -> {
                    Presencia nueva = new Presencia();
                    nueva.setFecha(hoy);
                    return nueva;
                });

        String valor = req.getPresentes();
        // Validar que sea un valor permitido
        if (!java.util.List.of("JOSE", "IGNA", "AMBOS", "AUSENTES").contains(valor)) {
            return ResponseEntity.badRequest().build();
        }

        p.setPresentes(valor);
        p.setModificadoPor(req.getModificadoPor());
        return ResponseEntity.ok(presenciaRepository.save(p));
    }
}