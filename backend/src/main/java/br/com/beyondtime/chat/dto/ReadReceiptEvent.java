package br.com.beyondtime.chat.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReadReceiptEvent(
        UUID conversationId,
        UUID readerUserId,
        int messagesMarkedRead,
        OffsetDateTime readAt
) {
}
