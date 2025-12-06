package com.kbn_backend.kbn_backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Manejo de excepciones generales
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAllExceptions(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Ocurrió un error en el servidor: " + ex.getMessage());
    }

    // Manejo de excepciones personalizadas (Paciente no encontrado)
    @ExceptionHandler(PacienteNoEncontradoException.class)
    public ResponseEntity<String> handlePacienteNoEncontrado(PacienteNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Paciente no encontrado: " + ex.getMessage());
    }

    // Manejo de errores de validación
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<String> handleValidationExceptions(jakarta.validation.ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Errores de validación: " + ex.getMessage());
    }
}
