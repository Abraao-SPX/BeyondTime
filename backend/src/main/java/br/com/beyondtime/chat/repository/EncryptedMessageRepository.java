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

    List<EncryptedMessage> findByConversationIdOrderBySentAtAsc(UUID conversationId, Pageable pageable);

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
