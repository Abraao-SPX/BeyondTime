package br.com.beyondtime.discovery.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MatchInteractionRequest(
        @NotNull(message = "targetUserId é obrigatório.")
        UUID targetUserId,

        Boolean confirmedViaModal
) {
}
