package br.com.beyondtime.block.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateBlockRequest(
        @NotNull(message = "blockedUserId é obrigatório.")
        UUID blockedUserId,

        @Size(max = 255, message = "O motivo do bloqueio deve ter no máximo 255 caracteres.")
        String reason,

        Boolean confirmedViaModal
) {
}
