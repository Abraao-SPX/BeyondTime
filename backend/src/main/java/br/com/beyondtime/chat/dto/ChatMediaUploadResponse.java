package br.com.beyondtime.chat.dto;

import br.com.beyondtime.chat.domain.ChatMessageType;

import java.util.UUID;

public record ChatMediaUploadResponse(
        UUID mediaId,
        UUID conversationId,
        ChatMessageType mediaType,
        long sizeBytes
) {
}
