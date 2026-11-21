package br.com.beyondtime.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lgpd_data_requests")
public class LgpdDataRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "request_type", nullable = false, length = 30)
    private String requestType;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "confirmed_via_defensive_modal", nullable = false)
    private boolean confirmedViaDefensiveModal = true;

    @Column(name = "sla_deadline_at", nullable = false)
    private OffsetDateTime slaDeadlineAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected LgpdDataRequest() {
    }

    public static LgpdDataRequest createCompletedAccountDeletion(UUID userId, boolean confirmedViaDefensiveModal, OffsetDateTime now) {
        LgpdDataRequest req = new LgpdDataRequest();
        req.userId = userId;
        req.requestType = "DEFINITIVE_ACCOUNT_DELETION";
        req.status = "COMPLETED";
        req.confirmedViaDefensiveModal = confirmedViaDefensiveModal;
        req.slaDeadlineAt = now.plusHours(48);
        req.completedAt = now;
        req.createdAt = now;
        return req;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.slaDeadlineAt == null) {
            this.slaDeadlineAt = now.plusHours(48);
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRequestType() {
        return requestType;
    }

    public String getStatus() {
        return status;
    }

    public boolean isConfirmedViaDefensiveModal() {
        return confirmedViaDefensiveModal;
    }

    public OffsetDateTime getSlaDeadlineAt() {
        return slaDeadlineAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
