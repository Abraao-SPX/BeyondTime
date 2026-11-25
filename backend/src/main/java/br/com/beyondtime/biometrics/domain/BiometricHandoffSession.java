package br.com.beyondtime.biometrics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "biometric_handoff_sessions")
public class BiometricHandoffSession {

    @Id
    @Column(name = "token", nullable = false, length = 96)
    private String token;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BiometricHandoffStatus status = BiometricHandoffStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    protected BiometricHandoffSession() {
    }

    public BiometricHandoffSession(
            String token,
            UUID userId,
            String firstName,
            OffsetDateTime createdAt,
            OffsetDateTime expiresAt) {
        this.token = token;
        this.userId = userId;
        this.firstName = firstName;
        this.status = BiometricHandoffStatus.PENDING;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public boolean isExpiredAt(OffsetDateTime now) {
        return expiresAt.isBefore(now) || status == BiometricHandoffStatus.EXPIRED;
    }

    public void markExpired() {
        if (this.status == BiometricHandoffStatus.PENDING) {
            this.status = BiometricHandoffStatus.EXPIRED;
        }
    }

    public void markCompleted(OffsetDateTime now) {
        this.status = BiometricHandoffStatus.COMPLETED;
        this.completedAt = now;
    }

    public String getToken() {
        return token;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public BiometricHandoffStatus getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }
}
