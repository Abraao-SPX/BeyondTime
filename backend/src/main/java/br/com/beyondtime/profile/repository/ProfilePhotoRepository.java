package br.com.beyondtime.profile.repository;

import br.com.beyondtime.profile.domain.ProfilePhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfilePhotoRepository extends JpaRepository<ProfilePhoto, UUID> {

    Optional<ProfilePhoto> findByProfileIdAndPosition(UUID profileId, short position);

    List<ProfilePhoto> findAllByProfileIdOrderByPositionAsc(UUID profileId);
}
