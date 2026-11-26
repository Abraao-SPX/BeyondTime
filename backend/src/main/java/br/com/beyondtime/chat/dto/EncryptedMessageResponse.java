package br.com.beyondtime.chat.dto;

import br.com.beyondtime.chat.domain.ChatMessageType;
import br.com.beyondtime.chat.domain.EncryptedMessage;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EncryptedMessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        UUID recipientId,
        String ciphertext,
        String iv,
        ChatMessageType messageType,
        UUID mediaId,
        String mediaIv,
        String mediaMimeType,
        Integer mediaDurationSeconds,
        int senderKeyVersion,
        OffsetDateTime sentAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime readAt
) {
    public static EncryptedMessageResponse from(EncryptedMessage entity) {
        return new EncryptedMessageResponse(
                entity.getId(),
                entity.getConversationId(),
                entity.getSenderId(),
                entity.getRecipientId(),
                entity.getCiphertext(),
                entity.getIv(),
                entity.getMessageType(),
                entity.getMediaId(),
                entity.getMediaIv(),
                entity.getMediaMimeType(),
                entity.getMediaDurationSeconds(),
                entity.getSenderKeyVersion(),
                entity.getSentAt(),
                entity.getDeliveredAt(),
                entity.getReadAt()
        );
    }
}
