package br.com.beyondtime.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnlockBiometricVaultRequest(
        @NotBlank(message = "O token biométrico de prova de vida é obrigatório.")
        @Size(max = 4096)
        String biometricToken
) {
}
