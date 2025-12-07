package com.kbn_backend.kbn_backend.config;

import com.kbn_backend.kbn_backend.model.Rol;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.RolRepository;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminConfig {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostConstruct
    public void init() {

        // SOLO crea el admin si no existe
        if (!usuarioRepository.existsByEmail("admin@example.com")) {

            // 1. Crear/obtener el rol ADMINISTRADOR
            Rol adminRole = rolRepository.findByNombre("ADMINISTRADOR");

            if (adminRole == null) {
                adminRole = new Rol();
                adminRole.setNombre("ADMINISTRADOR");
                rolRepository.save(adminRole);
            }

            // 2. Crear usuario admin
            Usuario admin = new Usuario();
            admin.setNombre("admin");
            admin.setApellido("admin");
            admin.setEmail("admin@example.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRol(adminRole);

            // 3. Guardar usuario admin
            usuarioRepository.save(admin);

            System.out.println("✔ Usuario ADMINISTRADOR creado correctamente");
        }
    }
}
