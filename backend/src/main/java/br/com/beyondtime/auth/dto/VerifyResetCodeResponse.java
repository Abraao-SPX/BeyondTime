package br.com.beyondtime.auth.dto;

public record VerifyResetCodeResponse(
        boolean valid,
        String message
) {
}
