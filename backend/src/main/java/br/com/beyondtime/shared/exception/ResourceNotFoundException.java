package br.com.beyondtime.shared.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String resourceName, Object identifier) {
        super(
                "RESOURCE_NOT_FOUND",
                String.format("%s não encontrado(a) para o identificador informado: %s", resourceName, identifier),
                HttpStatus.NOT_FOUND
        );
    }
}
