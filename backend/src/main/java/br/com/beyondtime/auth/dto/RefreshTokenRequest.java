package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshTokenRequest(
        @NotBlank(message = "O refresh token é obrigatório.")
        @Size(max = 512, message = "O refresh token deve ter no máximo 512 caracteres.")
        String refreshToken
) {
}
