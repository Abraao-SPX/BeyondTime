package br.com.beyondtime.discovery.dto;

import java.util.List;
import java.util.UUID;

public record MatchInteractionResponse(
        String action,
        UUID targetUserId,
        boolean matched,
        UUID matchId,
        UUID conversationId,
        int affinityPercent,
        List<String> sharedHobbies,
        DiscoveryProfileResponse contact
) {
}
