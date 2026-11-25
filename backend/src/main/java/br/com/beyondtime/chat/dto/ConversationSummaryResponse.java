package br.com.beyondtime.chat.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ConversationSummaryResponse(
        UUID conversationId,
        UUID matchId,
        UUID contactUserId,
        String contactName,
        Integer contactAge,
        String contactCity,
        String contactAvatarUrl,
        String contactGoal,
        boolean contactVerified,
        int affinityPercent,
        List<String> sharedHobbies,
        boolean contactHasChatKey,
        String contactPublicKeyJwk,
        Integer contactKeyVersion,
        long unreadCount,
        EncryptedMessageResponse lastMessage,
        OffsetDateTime updatedAt
) {
}
