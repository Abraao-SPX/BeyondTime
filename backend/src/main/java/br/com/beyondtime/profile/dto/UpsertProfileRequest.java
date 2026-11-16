package br.com.beyondtime.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpsertProfileRequest(
        @NotBlank(message = "O nome de exibição é obrigatório.")
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres.")
        @Pattern(
                regexp = "^[\\p{L}\\p{N}\\s'\\-\\.]+$",
                message = "O nome deve conter apenas letras, números e espaços."
        )
        String fullName,

        @Size(max = 500, message = "A bio deve ter no máximo 500 caracteres.")
        String bio,

        @NotBlank(message = "A cidade de Sergipe é obrigatória.")
        String city,

        @NotNull(message = "A seleção de hobbies é obrigatória.")
        @Size(min = 3, max = 10, message = "Selecione entre 3 e 10 hobbies (RF-03).")
        List<String> hobbies,

        @NotBlank(message = "O objetivo de conexão é obrigatório.")
        String goal
) {
}
