package br.com.beyondtime.chat.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatKeyVaultResponse(
        UUID userId,
        String publicKeyJwk,
        String encryptedPrivateKey,
        String kdfSalt,
        String kdfIv,
        int kdfIterations,
        String keyAlgorithm,
        int keyVersion,
        String unlockMode,
        OffsetDateTime updatedAt
) {
}
