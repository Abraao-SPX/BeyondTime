package br.com.beyondtime.location.repository;

import br.com.beyondtime.location.domain.State;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StateRepository extends JpaRepository<State, Short> {
    Optional<State> findByUfIgnoreCase(String uf);
}
