package com.kbn_backend.kbn_backend.dto;

import com.kbn_backend.kbn_backend.model.Ubicacion;
import lombok.Data;

@Data
public class UsuarioDto {
    private String nombre;
    private String apellido;
    private String email;
    private String password;
    private String rol;
    private Long ubicacionId;
}
