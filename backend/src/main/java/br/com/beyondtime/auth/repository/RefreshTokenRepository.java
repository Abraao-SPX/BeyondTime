package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.RefreshToken;
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

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "user")
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt WHERE rt.user.id = :userId AND rt.revokedAt IS NULL")
    int revokeAllActiveTokensByUserId(@Param("userId") UUID userId, @Param("revokedAt") OffsetDateTime revokedAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RefreshToken rt WHERE rt.user.id = :userId AND (rt.revokedAt IS NOT NULL OR rt.expiresAt < :now)")
    int deleteInactiveTokensByUserId(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);
}
