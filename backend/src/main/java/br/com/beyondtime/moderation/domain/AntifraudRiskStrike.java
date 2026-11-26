package br.com.beyondtime.moderation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "antifraud_risk_strikes")
public class AntifraudRiskStrike {

    @Id
    private UUID id;

    @Column(name = "message_id", nullable = false, unique = true)
    private UUID messageId;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(name = "recipient_user_id", nullable = false)
    private UUID recipientUserId;

    @Column(name = "risk_label", nullable = false, length = 60)
    private String riskLabel;

    @Column(name = "confidence_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal confidencePercent;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AntifraudRiskStrike() {
    }

    public AntifraudRiskStrike(
            UUID messageId,
            UUID conversationId,
            UUID senderUserId,
            UUID recipientUserId,
            String riskLabel,
            BigDecimal confidencePercent) {
        this.id = UUID.randomUUID();
        this.messageId = messageId;
        this.conversationId = conversationId;
        this.senderUserId = senderUserId;
        this.recipientUserId = recipientUserId;
        this.riskLabel = riskLabel;
        this.confidencePercent = confidencePercent;
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

    public UUID getId() {
        return id;
    }

    public UUID getMessageId() {
        return messageId;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getSenderUserId() {
        return senderUserId;
    }

    public UUID getRecipientUserId() {
        return recipientUserId;
    }

    public String getRiskLabel() {
        return riskLabel;
    }

    public BigDecimal getConfidencePercent() {
        return confidencePercent;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
