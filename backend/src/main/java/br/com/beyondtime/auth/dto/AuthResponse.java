package br.com.beyondtime.auth.dto;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.shared.util.AgeValidator;

import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        int age,
        String role,
        String status,
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        long refreshExpiresInSeconds
) {
    public static AuthResponse of(
            User user,
            String accessToken,
            String refreshToken,
            long expiresInSeconds,
            long refreshExpiresInSeconds) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                AgeValidator.calculateAge(user.getBirthDate()),
                user.getRole().name(),
                user.getStatus().name(),
                accessToken,
                refreshToken,
                "Bearer",
                expiresInSeconds,
                refreshExpiresInSeconds
        );
    }
}
