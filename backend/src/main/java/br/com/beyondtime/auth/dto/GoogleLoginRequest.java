package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record GoogleLoginRequest(
        @NotBlank(message = "O identificador da conta Google é obrigatório.")
        String googleUserId,

        @NotBlank(message = "O e-mail da conta Google é obrigatório.")
        @Email(message = "Informe um endereço de e-mail válido.")
        String email,

        LocalDate birthDate
) {
}
