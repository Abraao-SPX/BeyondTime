package br.com.beyondtime.profile.dto;

import java.util.List;
import java.util.UUID;

public record ProfileResponse(
        UUID id,
        UUID userId,
        String fullName,
        String firstName,
        String bio,
        String city,
        List<String> hobbies,
        String goal,
        String avatarUrl,
        String verificationStatus,
        boolean verifiedBadge50plus
) {
}
