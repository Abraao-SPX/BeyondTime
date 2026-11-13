package br.com.beyondtime.biometrics.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyBiometricsRequest(
        @NotBlank(message = "O token biométrico é obrigatório.")
        String biometricToken
) {
}
