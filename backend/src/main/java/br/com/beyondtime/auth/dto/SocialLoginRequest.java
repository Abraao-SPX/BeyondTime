package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SocialLoginRequest(
        @NotBlank(message = "O idToken do Firebase é obrigatório.")
        @Size(max = 8192, message = "O idToken excede o tamanho máximo permitido.")
        String idToken,

        @Past(message = "A data de nascimento deve estar no passado.")
        LocalDate birthDate
) {
}
