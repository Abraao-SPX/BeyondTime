package br.com.beyondtime.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "used_biometric_unlock_jtis")
public class UsedBiometricUnlockJti {

    @Id
    @Column(name = "jti", length = 128)
    private String jti;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    protected UsedBiometricUnlockJti() {
    }

    public UsedBiometricUnlockJti(String jti, UUID userId) {
        this.jti = jti;
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        if (this.usedAt == null) {
            this.usedAt = OffsetDateTime.now();
        }
    }

    public String getJti() {
        return jti;
    }

    public UUID getUserId() {
        return userId;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }
}
