package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByMatchId(UUID matchId);
}
