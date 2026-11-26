package br.com.beyondtime.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "encrypted_messages")
public class EncryptedMessage {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "ciphertext", nullable = false, columnDefinition = "TEXT")
    private String ciphertext;

    @Column(name = "iv", nullable = false, length = 128)
    private String iv;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private ChatMessageType messageType = ChatMessageType.TEXT;

    @Column(name = "media_id")
    private UUID mediaId;

    @Column(name = "media_iv", length = 128)
    private String mediaIv;

    @Column(name = "media_mime_type", length = 80)
    private String mediaMimeType;

    @Column(name = "media_duration_seconds")
    private Integer mediaDurationSeconds;

    @Column(name = "sender_key_version", nullable = false)
    private int senderKeyVersion = 1;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    protected EncryptedMessage() {
    }

    public EncryptedMessage(
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
            int senderKeyVersion) {
        this.id = UUID.randomUUID();
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.messageType = messageType != null ? messageType : ChatMessageType.TEXT;
        this.mediaId = mediaId;
        this.mediaIv = mediaIv;
        this.mediaMimeType = mediaMimeType;
        this.mediaDurationSeconds = mediaDurationSeconds;
        this.senderKeyVersion = Math.max(senderKeyVersion, 1);
    }

    @PrePersist
    void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.sentAt == null) {
            this.sentAt = OffsetDateTime.now();
        }
    }

    public void markDelivered() {
        if (this.deliveredAt == null) {
            this.deliveredAt = OffsetDateTime.now();
        }
    }

    public void markRead() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.deliveredAt == null) {
            this.deliveredAt = now;
        }
        if (this.readAt == null) {
            this.readAt = now;
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public UUID getRecipientId() {
        return recipientId;
    }

    public String getCiphertext() {
        return ciphertext;
    }

    public String getIv() {
        return iv;
    }

    public ChatMessageType getMessageType() {
        return messageType;
    }

    public UUID getMediaId() {
        return mediaId;
    }

    public String getMediaIv() {
        return mediaIv;
    }

    public String getMediaMimeType() {
        return mediaMimeType;
    }

    public Integer getMediaDurationSeconds() {
        return mediaDurationSeconds;
    }

    public int getSenderKeyVersion() {
        return senderKeyVersion;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public OffsetDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public OffsetDateTime getReadAt() {
        return readAt;
    }
}
