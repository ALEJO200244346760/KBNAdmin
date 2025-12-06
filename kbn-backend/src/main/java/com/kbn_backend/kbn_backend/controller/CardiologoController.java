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
public class CardiologoController {

    private final UsuarioService usuarioService;
    private final RolService rolService;

    @Autowired
    public CardiologoController(UsuarioService usuarioService, RolService rolService) {
        this.usuarioService = usuarioService;
        this.rolService = rolService;
    }

    // CRUD for Roles

    @PostMapping("/roles")
    public ResponseEntity<Rol> createRole(@RequestBody Rol rol) {
        Rol createdRole = rolService.createRole(rol);
        return ResponseEntity.ok(createdRole);
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Rol>> getAllRoles() {
        List<Rol> roles = rolService.getAllRoles();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/roles/{id}")
    public ResponseEntity<Rol> getRoleById(@PathVariable Long id) {
        Optional<Rol> role = rolService.getRoleById(id);
        return role.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/roles/{id}")
    public ResponseEntity<Rol> updateRole(@PathVariable Long id, @RequestBody Rol rol) {
        Optional<Rol> updatedRole = rolService.updateRole(id, rol);
        return updatedRole.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        boolean deleted = rolService.deleteRole(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // User Role Management
    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<Map<String, String>> addRoleToUser(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        String roleName = body.get("rol"); // o roleName, dependiendo de tu elección anterior
        try {
            usuarioService.addRoleToUser(userId, roleName);
            return ResponseEntity.ok(Map.of("message", "Rol asignado exitosamente"));
        } catch (Exception e) {
            System.err.println("Error al asignar rol: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al asignar rol: " + e.getMessage()));
        }
    }

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