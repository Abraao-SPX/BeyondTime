package br.com.beyondtime.moderation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "moderation_reports")
public class ModerationReport {

    @Id
    private UUID id;

    @Column(name = "audit_ticket_code", nullable = false, unique = true, length = 40)
    private String auditTicketCode;

    @Column(name = "reporter_user_id", nullable = false)
    private UUID reporterUserId;

    @Column(name = "reported_user_id", nullable = false)
    private UUID reportedUserId;

    @Column(name = "conversation_id")
    private UUID conversationId;

    @Column(name = "reason_code", nullable = false, length = 50)
    private String reasonCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "preventive_freeze_applied", nullable = false)
    private boolean preventiveFreezeApplied = true;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN_AUDIT";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    protected ModerationReport() {
    }

    public ModerationReport(
            String auditTicketCode,
            UUID reporterUserId,
            UUID reportedUserId,
            UUID conversationId,
            String reasonCode,
            String description,
            boolean preventiveFreezeApplied) {
        this.id = UUID.randomUUID();
        this.auditTicketCode = auditTicketCode;
        this.reporterUserId = reporterUserId;
        this.reportedUserId = reportedUserId;
        this.conversationId = conversationId;
        this.reasonCode = reasonCode;
        this.description = description;
        this.preventiveFreezeApplied = preventiveFreezeApplied;
        this.status = "OPEN_AUDIT";
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

    public String getAuditTicketCode() {
        return auditTicketCode;
    }

    public UUID getReporterUserId() {
        return reporterUserId;
    }

    public UUID getReportedUserId() {
        return reportedUserId;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public String getDescription() {
        return description;
    }

    public boolean isPreventiveFreezeApplied() {
        return preventiveFreezeApplied;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }
}
