package br.com.beyondtime.hobby.repository;

import br.com.beyondtime.hobby.domain.HobbyCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HobbyCategoryRepository extends JpaRepository<HobbyCategory, Short> {

    List<HobbyCategory> findAllByOrderByDisplayOrderAscNameAsc();
}
