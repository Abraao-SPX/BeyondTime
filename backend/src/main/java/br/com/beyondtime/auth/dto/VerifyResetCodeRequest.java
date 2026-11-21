package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyResetCodeRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um endereço de e-mail válido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @NotBlank(message = "O código de recuperação de 6 caracteres é obrigatório.")
        @Pattern(regexp = "^[A-Za-z0-9]{6}$", message = "O código de recuperação deve conter exatamente 6 caracteres (letras e/ou números).")
        String code
) {
}
