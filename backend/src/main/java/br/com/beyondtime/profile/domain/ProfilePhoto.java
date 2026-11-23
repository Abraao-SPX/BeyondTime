package br.com.beyondtime.profile.domain;

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
@Table(name = "profile_photos")
public class ProfilePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(name = "object_key", nullable = false, unique = true, length = 255)
    private String objectKey;

    @Column(name = "position", nullable = false)
    private short position;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ProfilePhoto() {
    }

    public ProfilePhoto(UUID profileId, String objectKey, short position) {
        this.profileId = profileId;
        this.objectKey = objectKey;
        this.position = position;
        this.status = "ACTIVE";
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public void updateObjectKey(String newObjectKey) {
        this.objectKey = newObjectKey;
        this.status = "ACTIVE";
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public short getPosition() {
        return position;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
