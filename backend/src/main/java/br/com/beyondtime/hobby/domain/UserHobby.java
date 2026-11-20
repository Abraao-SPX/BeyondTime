package br.com.beyondtime.hobby.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_hobbies")
public class UserHobby {

    @EmbeddedId
    private UserHobbyId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("hobbyId")
    @JoinColumn(name = "hobby_id", nullable = false)
    private Hobby hobby;

    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;

    protected UserHobby() {
    }

    public UserHobby(UUID userId, Hobby hobby, Instant selectedAt) {
        this.id = new UserHobbyId(userId, hobby.getId());
        this.hobby = hobby;
        this.selectedAt = selectedAt;
    }

    public UserHobbyId getId() {
        return id;
    }

    public Hobby getHobby() {
        return hobby;
    }

    public Instant getSelectedAt() {
        return selectedAt;
    }
}
