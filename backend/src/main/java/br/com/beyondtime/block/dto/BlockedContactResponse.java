package br.com.beyondtime.block.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BlockedContactResponse(
        UUID blockId,
        UUID id,
        UUID blockedUserId,
        String fullName,
        Integer age,
        String city,
        String avatarUrl,
        boolean verifiedBadge50plus,
        String reason,
        OffsetDateTime blockedAt
) {
}
