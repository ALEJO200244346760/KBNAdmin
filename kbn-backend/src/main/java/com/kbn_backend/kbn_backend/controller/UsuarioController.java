package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.dto.UsuarioDto;
import com.kbn_backend.kbn_backend.exception.ResourceNotFoundException;
import com.kbn_backend.kbn_backend.jwt.service.JwtUserDetailsService;
import com.kbn_backend.kbn_backend.model.Ubicacion;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/usuario")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;
    @Autowired
    private JwtUserDetailsService userDetailsService;

    @GetMapping
    public List<Usuario> getAllUsuarios() {
        return usuarioService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> getUsuarioById(@PathVariable Long id) {
        return usuarioService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/ubicacion")
    public ResponseEntity<Usuario> updateUserLocation(@PathVariable Long id, @RequestBody Ubicacion ubicacion) {
        try {
            Usuario updatedUser = usuarioService.updateUserLocation(id, ubicacion);
            return ResponseEntity.ok(updatedUser);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
