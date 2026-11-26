package br.com.beyondtime.biometrics.dto;

import java.time.OffsetDateTime;

public record CreateBiometricHandoffResponse(
        String handoffToken,
        OffsetDateTime expiresAt,
        long ttlSeconds
) {
}
