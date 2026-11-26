package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.Size;

public record LogoutRequest(
        @Size(max = 512, message = "Refresh token excede o tamanho máximo permitido.")
        String refreshToken
) {
}
