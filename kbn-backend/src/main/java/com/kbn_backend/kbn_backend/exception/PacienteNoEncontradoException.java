package com.kbn_backend.kbn_backend.exception;

public class PacienteNoEncontradoException extends RuntimeException {

    public PacienteNoEncontradoException(String dni) {
        super("Paciente con DNI " + dni + " no encontrado");
    }
}
