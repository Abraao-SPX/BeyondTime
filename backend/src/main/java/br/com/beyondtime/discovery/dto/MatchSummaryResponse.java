package br.com.beyondtime.discovery.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record MatchSummaryResponse(
        UUID matchId,
        UUID conversationId,
        UUID contactUserId,
        String contactName,
        Integer contactAge,
        String contactCity,
        String contactAvatarUrl,
        String contactGoal,
        boolean contactVerified,
        int affinityPercent,
        List<String> sharedHobbies,
        OffsetDateTime matchedAt
) {
}
