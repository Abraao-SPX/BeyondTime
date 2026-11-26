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
@Table(name = "encrypted_chat_media")
public class EncryptedChatMedia {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "uploader_user_id", nullable = false)
    private UUID uploaderUserId;

    @Column(name = "storage_filename", nullable = false, unique = true, length = 120)
    private String storageFilename;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 20)
    private ChatMessageType mediaType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected EncryptedChatMedia() {
    }

    public EncryptedChatMedia(
            UUID id,
            UUID conversationId,
            UUID uploaderUserId,
            String storageFilename,
            ChatMessageType mediaType,
            long sizeBytes) {
        this.id = id != null ? id : UUID.randomUUID();
        this.conversationId = conversationId;
        this.uploaderUserId = uploaderUserId;
        this.storageFilename = storageFilename;
        this.mediaType = mediaType;
        this.sizeBytes = sizeBytes;
    }

    @PrePersist
    void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getUploaderUserId() {
        return uploaderUserId;
    }

    public String getStorageFilename() {
        return storageFilename;
    }

    public ChatMessageType getMediaType() {
        return mediaType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
