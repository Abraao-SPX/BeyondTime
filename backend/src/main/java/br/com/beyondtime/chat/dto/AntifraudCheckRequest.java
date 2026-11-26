package br.com.beyondtime.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AntifraudCheckRequest(
        @NotBlank(message = "Texto para análise é obrigatório.")
        @Size(max = 4000, message = "Texto excede o limite de análise.")
        String text,
        UUID conversationId,
        UUID messageId
) {
    public AntifraudCheckRequest(String text) {
        this(text, null, null);
    }
}
