package br.com.beyondtime.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity(name = "ChatMatch")
@Table(name = "matches")
public class ChatMatch {

    @Id
    private UUID id;

    @Column(name = "user_a_id", nullable = false)
    private UUID userAId;

    @Column(name = "user_b_id", nullable = false)
    private UUID userBId;

    @Column(name = "affinity_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal affinityPercentage = BigDecimal.valueOf(85.00);

    @Column(name = "common_hobbies_count", nullable = false)
    private short commonHobbiesCount = 0;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ChatMatch() {
    }

    public ChatMatch(UUID user1, UUID user2, BigDecimal affinityPercentage, short commonHobbiesCount) {
        this.id = UUID.randomUUID();
        if (user1.toString().compareTo(user2.toString()) < 0) {
            this.userAId = user1;
            this.userBId = user2;
        } else {
            this.userAId = user2;
            this.userBId = user1;
        }
        this.affinityPercentage = affinityPercentage != null ? affinityPercentage : BigDecimal.valueOf(85.00);
        this.commonHobbiesCount = commonHobbiesCount;
        this.status = "ACTIVE";
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserAId() {
        return userAId;
    }

    public UUID getUserBId() {
        return userBId;
    }

    public BigDecimal getAffinityPercentage() {
        return affinityPercentage;
    }

    public short getCommonHobbiesCount() {
        return commonHobbiesCount;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void markStatus(String newStatus) {
        this.status = newStatus;
        this.updatedAt = OffsetDateTime.now();
    }

    public void reactivateWithAffinity(BigDecimal affinityPercentage, short commonHobbiesCount) {
        this.affinityPercentage = affinityPercentage != null ? affinityPercentage : this.affinityPercentage;
        this.commonHobbiesCount = commonHobbiesCount;
        this.status = "ACTIVE";
        this.updatedAt = OffsetDateTime.now();
    }

    public boolean involves(UUID userId) {
        return userAId.equals(userId) || userBId.equals(userId);
    }

    public UUID getOtherUserId(UUID currentUserId) {
        return userAId.equals(currentUserId) ? userBId : userAId;
    }
}
