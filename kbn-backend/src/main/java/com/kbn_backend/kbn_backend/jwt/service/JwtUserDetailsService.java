package com.kbn_backend.kbn_backend.jwt.service;

import com.kbn_backend.kbn_backend.dto.UsuarioDto;
import com.kbn_backend.kbn_backend.model.Rol;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.RolRepository;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class JwtUserDetailsService implements org.springframework.security.core.userdetails.UserDetailsService{

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<Usuario> userOpt = usuarioRepository.findByEmail(email);
        if (!userOpt.isPresent()) {
            throw new UsernameNotFoundException("Usuario no encontrado con el email: " + email);
        }
        Usuario usuario = userOpt.get();
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombre());
        return new org.springframework.security.core.userdetails.User(usuario.getEmail(), usuario.getPassword(), Collections.singletonList(authority));
    }

    public Usuario save(UsuarioDto usuarioDto) {
        Usuario newUsuario = new Usuario();
        newUsuario.setNombre(usuarioDto.getNombre());
        newUsuario.setApellido(usuarioDto.getApellido());
        newUsuario.setEmail(usuarioDto.getEmail());
        newUsuario.setPassword(passwordEncoder.encode(usuarioDto.getPassword()));

        Rol userRole = rolRepository.findByNombre("INSTRUCTOR");
        if (userRole == null) {
            userRole = new Rol();
            userRole.setNombre("INSTRUCTOR");
            rolRepository.save(userRole);
        }
        newUsuario.setRol(userRole);

        return usuarioRepository.save(newUsuario);
    }

    public List<Usuario> findAll() {
        return usuarioRepository.findAll();
    }

    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    public void deleteById(Long id) {
        usuarioRepository.deleteById(id);
    }
}
