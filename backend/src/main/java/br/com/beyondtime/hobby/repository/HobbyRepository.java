package br.com.beyondtime.hobby.repository;

import br.com.beyondtime.hobby.domain.Hobby;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface HobbyRepository extends JpaRepository<Hobby, Integer> {

    @EntityGraph(attributePaths = "category")
    List<Hobby> findByActiveTrueOrderByCategoryDisplayOrderAscNameAsc();

    @EntityGraph(attributePaths = "category")
    List<Hobby> findByIdInAndActiveTrue(Collection<Integer> ids);
}
