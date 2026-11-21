package br.com.beyondtime.profile.repository;

import br.com.beyondtime.profile.domain.Hobby;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HobbyRepository extends JpaRepository<Hobby, Integer> {
    List<Hobby> findAllByOrderByIdAsc();
}
