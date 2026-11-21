package br.com.beyondtime.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "profile_intents")
public class ProfileIntent {

    @EmbeddedId
    private ProfileIntentId id;

    protected ProfileIntent() {
    }

    public ProfileIntent(UUID profileId, Short intentId) {
        this.id = new ProfileIntentId(profileId, intentId);
    }

    public ProfileIntentId getId() {
        return id;
    }

    @Embeddable
    public static class ProfileIntentId implements Serializable {
        @Column(name = "profile_id", nullable = false)
        private UUID profileId;

        @Column(name = "intent_id", nullable = false)
        private Short intentId;

        protected ProfileIntentId() {
        }

        public ProfileIntentId(UUID profileId, Short intentId) {
            this.profileId = profileId;
            this.intentId = intentId;
        }

        public UUID getProfileId() {
            return profileId;
        }

        public Short getIntentId() {
            return intentId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ProfileIntentId that)) return false;
            return Objects.equals(profileId, that.profileId) && Objects.equals(intentId, that.intentId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(profileId, intentId);
        }
    }
}
