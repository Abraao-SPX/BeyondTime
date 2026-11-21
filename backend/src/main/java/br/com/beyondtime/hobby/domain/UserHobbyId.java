package br.com.beyondtime.hobby.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class UserHobbyId implements Serializable {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "hobby_id", nullable = false)
    private Integer hobbyId;

    protected UserHobbyId() {
    }

    public UserHobbyId(UUID userId, Integer hobbyId) {
        this.userId = userId;
        this.hobbyId = hobbyId;
    }

    public UUID getUserId() {
        return userId;
    }

    public Integer getHobbyId() {
        return hobbyId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserHobbyId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(hobbyId, that.hobbyId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, hobbyId);
    }
}
