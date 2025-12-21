package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.model.Rol;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.service.RolService;
import com.kbn_backend.kbn_backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/administracion")
public class AdminController {

    private final UsuarioService usuarioService;
    private final RolService rolService;

    @Autowired
    public AdminController(UsuarioService usuarioService, RolService rolService) {
        this.usuarioService = usuarioService;
        this.rolService = rolService;
    }

    @PostMapping("/roles")
    public ResponseEntity<Rol> createRole(@RequestBody Rol rol) {
        Rol createdRole = rolService.createRole(rol);
        return ResponseEntity.ok(createdRole);
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Rol>> getAllRoles() {
        return ResponseEntity.ok(rolService.getAllRoles());
    }

    // --- GESTIÓN DE USUARIOS ---

    // 1. Asignar ROL
    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<?> addRoleToUser(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        String roleName = body.get("rol");
        try {
            usuarioService.addRoleToUser(userId, roleName);
            return ResponseEntity.ok(Map.of("message", "Rol asignado exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al asignar rol: " + e.getMessage()));
        }
    }

    // 2. Editar Datos del Usuario (NUEVO)
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Usuario usuarioDetails) {
        Optional<Usuario> userOptional = usuarioService.findById(id);

        if (userOptional.isPresent()) {
            Usuario user = userOptional.get();
            // Actualizamos solo campos permitidos
            user.setNombre(usuarioDetails.getNombre());
            user.setApellido(usuarioDetails.getApellido());
            user.setEmail(usuarioDetails.getEmail());
            // Nota: No actualizamos contraseña aquí por seguridad

            usuarioService.save(user); // Asumiendo que tu servicio tiene un método save
            return ResponseEntity.ok(Map.of("message", "Usuario actualizado correctamente"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 3. Eliminar Usuario
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUsuario(@PathVariable Long id) {
        return usuarioService.findById(id)
                .map(user -> {
                    usuarioService.deleteById(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}