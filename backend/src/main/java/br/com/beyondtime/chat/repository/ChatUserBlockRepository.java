package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.ChatUserBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository("chatUserBlockRepository")
public interface ChatUserBlockRepository extends JpaRepository<ChatUserBlock, UUID> {

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM ChatUserBlock b " +
           "WHERE (b.blockerUserId = :userA AND b.blockedUserId = :userB) " +
           "   OR (b.blockerUserId = :userB AND b.blockedUserId = :userA)")
    boolean existsBlockBetween(@Param("userA") UUID userA, @Param("userB") UUID userB);

    List<ChatUserBlock> findByBlockerUserIdOrderByCreatedAtDesc(UUID blockerUserId);

    Optional<ChatUserBlock> findByBlockerUserIdAndBlockedUserId(UUID blockerUserId, UUID blockedUserId);

    Optional<ChatUserBlock> findByIdAndBlockerUserId(UUID id, UUID blockerUserId);

    @Query("SELECT CASE WHEN b.blockerUserId = :userId THEN b.blockedUserId ELSE b.blockerUserId END " +
           "FROM ChatUserBlock b " +
           "WHERE b.blockerUserId = :userId OR b.blockedUserId = :userId")
    List<UUID> findMutuallyBlockedUserIds(@Param("userId") UUID userId);
}
