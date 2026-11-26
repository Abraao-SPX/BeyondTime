package br.com.beyondtime.biometrics.repository;

import br.com.beyondtime.biometrics.domain.BiometricHandoffSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BiometricHandoffSessionRepository extends JpaRepository<BiometricHandoffSession, String> {
    void deleteAllByUserId(UUID userId);
}
