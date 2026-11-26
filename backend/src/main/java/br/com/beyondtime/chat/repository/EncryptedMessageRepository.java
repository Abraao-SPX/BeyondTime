package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.EncryptedMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EncryptedMessageRepository extends JpaRepository<EncryptedMessage, UUID> {

    List<EncryptedMessage> findByConversationIdOrderBySentAtDescIdDesc(UUID conversationId, Pageable pageable);

    @Query("SELECT m FROM EncryptedMessage m " +
           "WHERE m.conversationId = :conversationId " +
           "AND (m.sentAt < :beforeSentAt OR (m.sentAt = :beforeSentAt AND m.id < :beforeId)) " +
           "ORDER BY m.sentAt DESC, m.id DESC")
    List<EncryptedMessage> findBeforeCursor(
            @Param("conversationId") UUID conversationId,
            @Param("beforeSentAt") OffsetDateTime beforeSentAt,
            @Param("beforeId") UUID beforeId,
            Pageable pageable);

    @Query("SELECT m FROM EncryptedMessage m " +
           "WHERE m.conversationId = :conversationId AND m.sentAt < :beforeSentAt " +
           "ORDER BY m.sentAt DESC, m.id DESC")
    List<EncryptedMessage> findBeforeSentAt(
            @Param("conversationId") UUID conversationId,
            @Param("beforeSentAt") OffsetDateTime beforeSentAt,
            Pageable pageable);

    Optional<EncryptedMessage> findTopByConversationIdOrderBySentAtDesc(UUID conversationId);

    long countByConversationIdAndRecipientIdAndReadAtIsNull(UUID conversationId, UUID recipientId);

    @Modifying
    @Query("UPDATE EncryptedMessage m SET m.readAt = :readAt, m.deliveredAt = COALESCE(m.deliveredAt, :readAt) " +
           "WHERE m.conversationId = :conversationId AND m.recipientId = :recipientId AND m.readAt IS NULL")
    int markAllAsRead(
            @Param("conversationId") UUID conversationId,
            @Param("recipientId") UUID recipientId,
            @Param("readAt") OffsetDateTime readAt);
}
