package br.com.beyondtime.chat.dto;

import java.util.UUID;

public record PublicChatKeyResponse(
        UUID userId,
        String publicKeyJwk,
        String keyAlgorithm,
        int keyVersion
) {
}
