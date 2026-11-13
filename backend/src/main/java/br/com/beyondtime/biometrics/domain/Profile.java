package br.com.beyondtime.biometrics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "city_id", nullable = false)
    private Integer cityId;

    @Column(name = "neighborhood_id")
    private Integer neighborhoodId;

    @Column(name = "audio_intro_key", length = 255)
    private String audioIntroKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @Column(name = "verified_badge_50plus", nullable = false)
    private boolean verifiedBadge50plus = false;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Profile() {
    }

    public Profile(UUID userId, String displayName, String firstName, Integer cityId) {
        this.userId = userId;
        this.displayName = displayName;
        this.firstName = firstName;
        this.cityId = cityId;
        this.verificationStatus = VerificationStatus.PENDING;
        this.verifiedBadge50plus = false;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public void grantVerifiedBadge50Plus() {
        this.verifiedBadge50plus = true;
        this.verificationStatus = VerificationStatus.VERIFIED;
        this.verifiedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public void markVerificationFailed() {
        this.verificationStatus = VerificationStatus.FAILED;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getBio() {
        return bio;
    }

    public Integer getCityId() {
        return cityId;
    }

    public Integer getNeighborhoodId() {
        return neighborhoodId;
    }

    public String getAudioIntroKey() {
        return audioIntroKey;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public boolean isVerifiedBadge50plus() {
        return verifiedBadge50plus;
    }

    public OffsetDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
