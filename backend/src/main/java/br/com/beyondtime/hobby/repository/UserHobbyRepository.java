package br.com.beyondtime.hobby.repository;

import br.com.beyondtime.hobby.domain.UserHobby;
import br.com.beyondtime.hobby.domain.UserHobbyId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserHobbyRepository extends JpaRepository<UserHobby, UserHobbyId> {

    @EntityGraph(attributePaths = {"hobby", "hobby.category"})
    List<UserHobby> findByIdUserIdOrderByHobbyNameAsc(UUID userId);

    void deleteByIdUserId(UUID userId);
}
