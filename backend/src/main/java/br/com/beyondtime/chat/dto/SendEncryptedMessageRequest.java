package br.com.beyondtime.chat.dto;

import br.com.beyondtime.chat.domain.ChatMessageType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SendEncryptedMessageRequest(
        @NotNull(message = "conversationId é obrigatório.")
        UUID conversationId,

        @NotBlank(message = "ciphertext é obrigatório.")
        @Size(max = 32768, message = "Mensagem cifrada excede o limite permitido.")
        String ciphertext,

        @NotBlank(message = "iv é obrigatório.")
        @Size(max = 128)
        String iv,

        ChatMessageType messageType,

        UUID mediaId,

        @Size(max = 128)
        String mediaIv,

        @Size(max = 80)
        String mediaMimeType,

        @Min(0)
        @Max(600)
        Integer mediaDurationSeconds,

        @Min(1)
        Integer senderKeyVersion
) {
}
