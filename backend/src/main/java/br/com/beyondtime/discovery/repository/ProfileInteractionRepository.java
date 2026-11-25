package br.com.beyondtime.discovery.repository;

import br.com.beyondtime.discovery.domain.ProfileInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfileInteractionRepository extends JpaRepository<ProfileInteraction, UUID> {

    Optional<ProfileInteraction> findByFromUserIdAndToUserId(UUID fromUserId, UUID toUserId);

    boolean existsByFromUserIdAndToUserIdAndAction(UUID fromUserId, UUID toUserId, String action);

    @Query("SELECT pi.toUserId FROM ProfileInteraction pi WHERE pi.fromUserId = :fromUserId")
    List<UUID> findInteractedTargetUserIds(@Param("fromUserId") UUID fromUserId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ProfileInteraction pi " +
           "WHERE (pi.fromUserId = :userA AND pi.toUserId = :userB) " +
           "   OR (pi.fromUserId = :userB AND pi.toUserId = :userA)")
    void deleteAllBetweenUsers(@Param("userA") UUID userA, @Param("userB") UUID userB);
}
