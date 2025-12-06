package com.kbn_backend.kbn_backend.controller;

import com.kbn_backend.kbn_backend.dto.UsuarioDto;
import com.kbn_backend.kbn_backend.jwt.model.JwtRequest;
import com.kbn_backend.kbn_backend.jwt.model.JwtResponse;
import com.kbn_backend.kbn_backend.jwt.service.JwtUserDetailsService;
import com.kbn_backend.kbn_backend.jwt.util.JwtUtil;
import com.kbn_backend.kbn_backend.model.Usuario;
import com.kbn_backend.kbn_backend.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private JwtUserDetailsService userDetailsService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UsuarioService usuarioService;

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody JwtRequest authenticationRequest) throws Exception {
        authenticate(authenticationRequest.getEmail(), authenticationRequest.getPassword());

        final UserDetails userDetails = userDetailsService.loadUserByUsername(authenticationRequest.getEmail());

        Usuario usuario = usuarioService.findByEmail(authenticationRequest.getEmail())
                .orElseThrow(() -> new Exception("User not found"));

        List<String> roles = userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .collect(Collectors.toList());

        final String token = jwtUtil.generateToken(userDetails, roles, usuario.getNombre(), usuario.getApellido());

        return ResponseEntity.ok(new JwtResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<?> saveUser(@RequestBody UsuarioDto usuario) throws Exception {
        usuario.setRol("ENFERMERO");
        return ResponseEntity.ok(userDetailsService.save(usuario));
    }

    private void authenticate(String email, String password) throws Exception {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        } catch (DisabledException e) {
            throw new Exception("USER_DISABLED", e);
        } catch (BadCredentialsException e) {
            throw new Exception("INVALID_CREDENTIALS", e);
        }
    }


}

