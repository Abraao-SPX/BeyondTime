package br.com.beyondtime.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "profile_hobbies")
public class ProfileHobby {

    @EmbeddedId
    private ProfileHobbyId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ProfileHobby() {
    }

    public ProfileHobby(UUID profileId, Integer hobbyId) {
        this.id = new ProfileHobbyId(profileId, hobbyId);
        this.createdAt = OffsetDateTime.now();
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public ProfileHobbyId getId() {
        return id;
    }

    @Embeddable
    public static class ProfileHobbyId implements Serializable {
        @Column(name = "profile_id", nullable = false)
        private UUID profileId;

        @Column(name = "hobby_id", nullable = false)
        private Integer hobbyId;

        protected ProfileHobbyId() {
        }

        public ProfileHobbyId(UUID profileId, Integer hobbyId) {
            this.profileId = profileId;
            this.hobbyId = hobbyId;
        }

        public UUID getProfileId() {
            return profileId;
        }

        public Integer getHobbyId() {
            return hobbyId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ProfileHobbyId that)) return false;
            return Objects.equals(profileId, that.profileId) && Objects.equals(hobbyId, that.hobbyId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(profileId, hobbyId);
        }
    }
}
