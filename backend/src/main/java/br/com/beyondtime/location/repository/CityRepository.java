package br.com.beyondtime.location.repository;

import br.com.beyondtime.location.domain.City;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CityRepository extends JpaRepository<City, Integer> {

    @EntityGraph(attributePaths = "state")
    List<City> findAllByOrderByMetropolitanAracajuDescNameAsc();

    @EntityGraph(attributePaths = "state")
    List<City> findByStateUfIgnoreCaseOrderByMetropolitanAracajuDescNameAsc(String uf);

    @EntityGraph(attributePaths = "state")
    Optional<City> findWithStateById(Integer id);
}
