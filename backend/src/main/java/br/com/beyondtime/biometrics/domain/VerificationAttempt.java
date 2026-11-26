package br.com.beyondtime.biometrics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "verification_attempts")
public class VerificationAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_type", nullable = false, length = 40)
    private VerificationType verificationType = VerificationType.FACIAL_LIVENESS_YUNET_SFACE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VerificationStatus status;

    @Column(name = "liveness_passed")
    private Boolean livenessPassed;

    @Column(name = "similarity_distance", precision = 6, scale = 4)
    private BigDecimal similarityDistance;

    @Column(name = "biometric_service_jwt_id", length = 255)
    private String biometricServiceJwtId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected VerificationAttempt() {
    }

    public VerificationAttempt(
            UUID userId,
            VerificationType verificationType,
            VerificationStatus status,
            Boolean livenessPassed,
            BigDecimal similarityDistance,
            String biometricServiceJwtId) {
        this.userId = userId;
        this.verificationType = (verificationType != null) ? verificationType : VerificationType.FACIAL_LIVENESS_YUNET_SFACE;
        this.status = status;
        this.livenessPassed = livenessPassed;
        this.similarityDistance = similarityDistance;
        this.biometricServiceJwtId = biometricServiceJwtId;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public VerificationType getVerificationType() {
        return verificationType;
    }

    public VerificationStatus getStatus() {
        return status;
    }

    public Boolean getLivenessPassed() {
        return livenessPassed;
    }

    public BigDecimal getSimilarityDistance() {
        return similarityDistance;
    }

    public String getBiometricServiceJwtId() {
        return biometricServiceJwtId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
