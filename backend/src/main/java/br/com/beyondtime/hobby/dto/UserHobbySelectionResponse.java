package br.com.beyondtime.hobby.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserHobbySelectionResponse(
        UUID userId,
        int totalSelected,
        Instant updatedAt,
        List<HobbyResponse> hobbies
) {
}
