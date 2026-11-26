package br.com.beyondtime.moderation.dto;

import br.com.beyondtime.moderation.domain.ModerationReport;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ModerationReportResponse(
        UUID reportId,
        String auditTicketCode,
        UUID reportedUserId,
        UUID conversationId,
        String reasonCode,
        boolean preventiveFreezeApplied,
        boolean blockedApplied,
        String status,
        OffsetDateTime createdAt
) {
    public static ModerationReportResponse from(ModerationReport report, boolean blockedApplied) {
        return new ModerationReportResponse(
                report.getId(),
                report.getAuditTicketCode(),
                report.getReportedUserId(),
                report.getConversationId(),
                report.getReasonCode(),
                report.isPreventiveFreezeApplied(),
                blockedApplied,
                report.getStatus(),
                report.getCreatedAt()
        );
    }
}
