package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.exception.ResourceNotFoundException;
import com.kbn_backend.kbn_backend.model.Rol;
import com.kbn_backend.kbn_backend.model.Ubicacion;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.RolRepository;
import com.kbn_backend.kbn_backend.repository.UbicacionRepository; // Asegúrate de importar el repositorio de Ubicacion
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private UbicacionRepository ubicacionRepository; // Añade esta línea para el repositorio de Ubicacion

    public List<Usuario> findAll() {
        return usuarioRepository.findAll();
    }

    public Optional<Usuario> findByEmail(String email) {
        return usuarioRepository.findByEmail(email);
    }

    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    public Usuario save(Usuario user) {
        return usuarioRepository.save(user);
    }

    public void deleteById(Long id) {
        Optional<Usuario> userOpt = usuarioRepository.findById(id);
        if (userOpt.isPresent()) {
            usuarioRepository.deleteById(id);
        } else {
            throw new RuntimeException("Usuario no encontrado");
        }
    }

    public void addRoleToUser(Long userId, String roleName) {
        Optional<Usuario> userOpt = usuarioRepository.findById(userId);
        if (userOpt.isPresent()) {
            Usuario usuario = userOpt.get();
            Rol role = rolRepository.findByNombre(roleName);
            if (role == null) {
                throw new RuntimeException("Rol no encontrado: " + roleName);
            }
            usuario.setRol(role);
            usuarioRepository.save(usuario);
        } else {
            throw new RuntimeException("Usuario no encontrado");
        }
    }

    public Usuario updateUserLocation(Long userId, Ubicacion ubicacion) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + userId));

        if (ubicacion != null && ubicacion.getId() != null) {
            Ubicacion existingUbicacion = ubicacionRepository.findById(ubicacion.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ubicación no encontrada con ID: " + ubicacion.getId()));
            usuario.setUbicacion(existingUbicacion);
        } else {
            throw new RuntimeException("Ubicación inválida");
        }

        return usuarioRepository.save(usuario);
    }
}
