package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "user")
    @Query("SELECT prt FROM PasswordResetToken prt WHERE prt.user.id = :userId AND prt.usedAt IS NULL ORDER BY prt.createdAt DESC")
    Optional<PasswordResetToken> findActiveTokenByUserIdForUpdate(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PasswordResetToken prt WHERE prt.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
