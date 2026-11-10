package br.com.beyondtime.location.repository;

import br.com.beyondtime.location.domain.SafePublicPlace;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SafePublicPlaceRepository extends JpaRepository<SafePublicPlace, Integer> {

    @EntityGraph(attributePaths = {"city", "neighborhood"})
    List<SafePublicPlace> findByActiveTrueOrderByNameAsc();

    @EntityGraph(attributePaths = {"city", "neighborhood"})
    List<SafePublicPlace> findByCityIdAndActiveTrueOrderByNameAsc(Integer cityId);
}
