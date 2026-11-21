package br.com.beyondtime.auth.dto;

public record LogoutRequest(
        String refreshToken
) {
}
