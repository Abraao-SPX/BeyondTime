package br.com.beyondtime.hobby.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UserHobbySelectionRequest(
        @NotEmpty(message = "Selecione entre 3 e 10 hobbies para continuar.")
        @Size(min = 3, max = 10, message = "A seleção deve conter no mínimo 3 e no máximo 10 hobbies.")
        List<@NotNull(message = "O identificador do hobby não pode ser nulo.") Integer> hobbyIds
) {
}
