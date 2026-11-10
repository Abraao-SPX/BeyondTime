package br.com.beyondtime.location.repository;

import br.com.beyondtime.location.domain.Neighborhood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Integer> {

    List<Neighborhood> findByCityIdOrderByNameAsc(Integer cityId);

    Optional<Neighborhood> findByIdAndCityId(Integer id, Integer cityId);
}
