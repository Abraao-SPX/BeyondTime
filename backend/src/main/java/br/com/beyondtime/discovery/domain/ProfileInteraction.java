package br.com.beyondtime.discovery.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "profile_interactions")
public class ProfileInteraction {

    @Id
    private UUID id;

    @Column(name = "from_user_id", nullable = false)
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false)
    private UUID toUserId;

    @Column(name = "action", nullable = false, length = 15)
    private String action;

    @Column(name = "confirmed_via_modal", nullable = false)
    private boolean confirmedViaModal = true;

    @Column(name = "affinity_score_snapshot", precision = 5, scale = 2)
    private BigDecimal affinityScoreSnapshot;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ProfileInteraction() {
    }

    public ProfileInteraction(
            UUID fromUserId,
            UUID toUserId,
            String action,
            boolean confirmedViaModal,
            BigDecimal affinityScoreSnapshot) {
        this.id = UUID.randomUUID();
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.action = action;
        this.confirmedViaModal = confirmedViaModal;
        this.affinityScoreSnapshot = affinityScoreSnapshot;
    }

    @PrePersist
    void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public void updateAction(String action, boolean confirmedViaModal, BigDecimal affinityScoreSnapshot) {
        this.action = action;
        this.confirmedViaModal = confirmedViaModal;
        this.affinityScoreSnapshot = affinityScoreSnapshot;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getFromUserId() {
        return fromUserId;
    }

    public UUID getToUserId() {
        return toUserId;
    }

    public String getAction() {
        return action;
    }

    public boolean isConfirmedViaModal() {
        return confirmedViaModal;
    }

    public BigDecimal getAffinityScoreSnapshot() {
        return affinityScoreSnapshot;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
