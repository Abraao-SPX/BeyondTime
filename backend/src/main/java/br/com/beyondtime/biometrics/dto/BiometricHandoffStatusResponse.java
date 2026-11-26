package br.com.beyondtime.biometrics.dto;

import java.time.OffsetDateTime;

public record BiometricHandoffStatusResponse(
        String status,
        boolean verifiedBadge50plus,
        OffsetDateTime expiresAt,
        OffsetDateTime completedAt
) {
}
