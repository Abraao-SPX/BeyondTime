package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.ChatMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository("chatMatchRepository")
public interface ChatMatchRepository extends JpaRepository<ChatMatch, UUID> {

    @Query("SELECT m FROM ChatMatch m WHERE m.userAId = :userA AND m.userBId = :userB")
    Optional<ChatMatch> findByPair(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Query("SELECT m FROM ChatMatch m WHERE (m.userAId = :userId OR m.userBId = :userId) AND m.status = 'ACTIVE' ORDER BY m.updatedAt DESC")
    List<ChatMatch> findActiveMatchesForUser(@Param("userId") UUID userId);
}
