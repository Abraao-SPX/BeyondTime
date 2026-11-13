package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    boolean existsByIdAndStatus(UUID id, UserStatus status);
}
