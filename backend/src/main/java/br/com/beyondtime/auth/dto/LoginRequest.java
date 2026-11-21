package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um endereço de e-mail válido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @NotBlank(message = "A senha é obrigatória.")
        @Size(min = 1, max = 72, message = "A senha deve ter no máximo 72 caracteres.")
        String password
) {
}
