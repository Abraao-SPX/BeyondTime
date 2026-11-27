package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.LgpdDataRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LgpdDataRequestRepository extends JpaRepository<LgpdDataRequest, UUID> {
    List<LgpdDataRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<LgpdDataRequest> findByRequestTypeAndStatus(String requestType, String status);
}
