package br.com.beyondtime.moderation.repository;

import br.com.beyondtime.moderation.domain.ModerationReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, UUID> {

    List<ModerationReport> findByReporterUserIdOrderByCreatedAtDesc(UUID reporterUserId);

    boolean existsByReportedUserIdAndStatus(UUID reportedUserId, String status);
}
