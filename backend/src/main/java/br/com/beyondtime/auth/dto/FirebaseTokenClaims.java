package br.com.beyondtime.auth.dto;

import br.com.beyondtime.auth.domain.OAuthProvider;

public record FirebaseTokenClaims(
        String uid,
        String email,
        boolean emailVerified,
        String name,
        OAuthProvider provider
) {
}
