package br.com.beyondtime.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity(name = "ChatUserBlock")
@Table(name = "user_blocks")
public class ChatUserBlock {

    @Id
    private UUID id;

    @Column(name = "blocker_user_id", nullable = false)
    private UUID blockerUserId;

    @Column(name = "blocked_user_id", nullable = false)
    private UUID blockedUserId;

    @Column(name = "confirmed_via_modal", nullable = false)
    private boolean confirmedViaModal = true;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ChatUserBlock() {
    }

    public ChatUserBlock(UUID blockerUserId, UUID blockedUserId, boolean confirmedViaModal, String reason) {
        this.id = UUID.randomUUID();
        this.blockerUserId = blockerUserId;
        this.blockedUserId = blockedUserId;
        this.confirmedViaModal = confirmedViaModal;
        this.reason = reason;
    }

    @PrePersist
    void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public void updateReason(String reason) {
        this.reason = reason;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBlockerUserId() {
        return blockerUserId;
    }

    public UUID getBlockedUserId() {
        return blockedUserId;
    }

    public boolean isConfirmedViaModal() {
        return confirmedViaModal;
    }

    public String getReason() {
        return reason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
