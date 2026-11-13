package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "A senha atual é obrigatória.")
        @Size(min = 1, max = 72, message = "A senha atual deve ter no máximo 72 caracteres.")
        String currentPassword,

        @NotBlank(message = "A nova senha é obrigatória.")
        @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.")
        @Pattern(regexp = "^\\S+$", message = "A nova senha não pode conter espaços em branco.")
        String newPassword,

        @NotBlank(message = "A confirmação da nova senha é obrigatória.")
        @Size(min = 8, max = 72, message = "A confirmação da nova senha deve ter entre 8 e 72 caracteres.")
        String confirmPassword
) {
}
