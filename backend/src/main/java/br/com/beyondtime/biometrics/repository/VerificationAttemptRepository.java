package br.com.beyondtime.biometrics.repository;

import br.com.beyondtime.biometrics.domain.VerificationAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VerificationAttemptRepository extends JpaRepository<VerificationAttempt, UUID> {

    List<VerificationAttempt> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
