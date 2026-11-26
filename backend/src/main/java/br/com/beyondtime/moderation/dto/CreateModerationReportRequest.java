package br.com.beyondtime.moderation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateModerationReportRequest(
        @NotNull(message = "Usuário denunciado é obrigatório.")
        UUID reportedUserId,
        UUID conversationId,
        @NotBlank(message = "Motivo da denúncia é obrigatório.")
        @Size(max = 50, message = "Código de motivo inválido.")
        String reasonCode,
        @Size(max = 500, message = "Descrição da denúncia deve ter no máximo 500 caracteres.")
        String description,
        Boolean confirmedViaModal,
        Boolean alsoBlock
) {
}
