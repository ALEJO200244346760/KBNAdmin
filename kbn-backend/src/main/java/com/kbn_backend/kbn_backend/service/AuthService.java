package com.kbn_backend.kbn_backend.service;

import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.repository.UsuarioRepository;
import com.kbn_backend.kbn_backend.jwt.model.JwtRequest;
import com.kbn_backend.kbn_backend.jwt.model.JwtResponse;
import com.kbn_backend.kbn_backend.jwt.service.JwtUserDetailsService;
import com.kbn_backend.kbn_backend.jwt.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUserDetailsService jwtUserDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public JwtResponse authenticate(JwtRequest jwtRequest) throws Exception {
        authenticate(jwtRequest.getEmail(), jwtRequest.getPassword());

        final UserDetails userDetails = jwtUserDetailsService.loadUserByUsername(jwtRequest.getEmail());

        Usuario usuario = usuarioRepository.findByEmail(jwtRequest.getEmail()).orElseThrow(() -> new RuntimeException("User not found"));

        List<String> roles = userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .collect(Collectors.toList());

        final String token = jwtUtil.generateToken(userDetails, roles, usuario.getNombre(), usuario.getApellido());

        return new JwtResponse(token);
    }

    public Usuario register(Usuario usuario) {
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        return usuarioRepository.save(usuario);
    }

    private void authenticate(String email, String password) throws Exception {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        } catch (Exception e) {
            throw new Exception("INVALID_CREDENTIALS", e);
        }
    }
}