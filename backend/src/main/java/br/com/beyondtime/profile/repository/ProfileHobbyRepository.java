package br.com.beyondtime.profile.repository;

import br.com.beyondtime.profile.domain.ProfileHobby;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProfileHobbyRepository extends JpaRepository<ProfileHobby, ProfileHobby.ProfileHobbyId> {

    @Query("SELECT ph.id.hobbyId FROM ProfileHobby ph WHERE ph.id.profileId = :profileId")
    List<Integer> findHobbyIdsByProfileId(@Param("profileId") UUID profileId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ProfileHobby ph WHERE ph.id.profileId = :profileId")
    void deleteAllByProfileId(@Param("profileId") UUID profileId);
}
