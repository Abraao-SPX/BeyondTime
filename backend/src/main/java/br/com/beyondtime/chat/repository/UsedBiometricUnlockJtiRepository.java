package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.UsedBiometricUnlockJti;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsedBiometricUnlockJtiRepository extends JpaRepository<UsedBiometricUnlockJti, String> {
}
