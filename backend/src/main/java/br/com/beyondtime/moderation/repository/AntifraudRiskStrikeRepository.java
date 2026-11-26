package br.com.beyondtime.moderation.repository;

import br.com.beyondtime.moderation.domain.AntifraudRiskStrike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public interface AntifraudRiskStrikeRepository extends JpaRepository<AntifraudRiskStrike, UUID> {

    boolean existsByMessageId(UUID messageId);

    long countByConversationIdAndSenderUserId(UUID conversationId, UUID senderUserId);

    @Query("SELECT COUNT(s) FROM AntifraudRiskStrike s " +
           "WHERE s.senderUserId = :senderUserId " +
           "AND s.confidencePercent >= :minConfidence " +
           "AND s.createdAt >= :since")
    long countRecentCriticalStrikes(
            @Param("senderUserId") UUID senderUserId,
            @Param("minConfidence") BigDecimal minConfidence,
            @Param("since") OffsetDateTime since);

    @Query("SELECT COUNT(DISTINCT s.recipientUserId) FROM AntifraudRiskStrike s " +
           "WHERE s.senderUserId = :senderUserId " +
           "AND s.confidencePercent >= :minConfidence " +
           "AND s.createdAt >= :since")
    long countDistinctRecipientsWithCriticalStrikes(
            @Param("senderUserId") UUID senderUserId,
            @Param("minConfidence") BigDecimal minConfidence,
            @Param("since") OffsetDateTime since);
}
