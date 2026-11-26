package br.com.beyondtime.profile.repository;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.profile.domain.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Optional<Profile> findByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Profile p WHERE p.userId = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    @Query("SELECT p FROM Profile p, User u " +
           "WHERE p.userId = u.id " +
           "  AND u.status = :status " +
           "  AND u.birthDate <= :maxBirthDate " +
           "  AND p.userId NOT IN :excludedUserIds")
    List<Profile> findDiscoveryCandidates(
            @Param("status") UserStatus status,
            @Param("maxBirthDate") LocalDate maxBirthDate,
            @Param("excludedUserIds") Collection<UUID> excludedUserIds
    );
}
