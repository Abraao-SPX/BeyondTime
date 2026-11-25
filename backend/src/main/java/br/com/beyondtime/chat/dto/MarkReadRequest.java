package br.com.beyondtime.chat.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MarkReadRequest(
        @NotNull(message = "conversationId é obrigatório.")
        UUID conversationId
) {
}
