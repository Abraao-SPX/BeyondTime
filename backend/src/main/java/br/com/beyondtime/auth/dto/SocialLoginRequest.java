package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record SocialLoginRequest(
        @NotBlank(message = "O idToken do Firebase é obrigatório.")
        String idToken,

        LocalDate birthDate
) {
}
