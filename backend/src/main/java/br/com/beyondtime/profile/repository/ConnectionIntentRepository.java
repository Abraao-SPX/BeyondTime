package br.com.beyondtime.profile.repository;

import br.com.beyondtime.profile.domain.ConnectionIntent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConnectionIntentRepository extends JpaRepository<ConnectionIntent, Short> {
    Optional<ConnectionIntent> findByCodeIgnoreCase(String code);
}
