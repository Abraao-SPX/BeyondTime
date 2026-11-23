package br.com.beyondtime.profile.repository;

import br.com.beyondtime.profile.domain.ProfileIntent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProfileIntentRepository extends JpaRepository<ProfileIntent, ProfileIntent.ProfileIntentId> {

    @Query("SELECT pi.id.intentId FROM ProfileIntent pi WHERE pi.id.profileId = :profileId")
    List<Short> findIntentIdsByProfileId(@Param("profileId") UUID profileId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ProfileIntent pi WHERE pi.id.profileId = :profileId")
    void deleteAllByProfileId(@Param("profileId") UUID profileId);
}
