package br.com.beyondtime.shared.security;

import br.com.beyondtime.auth.domain.UserRole;

import java.util.UUID;

public record AuthenticatedUser(
        UUID userId,
        String email,
        UserRole role
) {
}
