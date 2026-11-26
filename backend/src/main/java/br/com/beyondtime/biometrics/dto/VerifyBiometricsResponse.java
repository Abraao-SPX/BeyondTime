package br.com.beyondtime.biometrics.dto;

import br.com.beyondtime.biometrics.domain.VerificationStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record VerifyBiometricsResponse(
        boolean success,
        String message,
        UUID profileId,
        UUID userId,
        boolean verifiedBadge50plus,
        VerificationStatus verificationStatus,
        OffsetDateTime verifiedAt,
        BigDecimal similarityDistance,
        Boolean livenessPassed
) {
}
