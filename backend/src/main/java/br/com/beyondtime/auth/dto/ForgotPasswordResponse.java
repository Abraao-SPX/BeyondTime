package br.com.beyondtime.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ForgotPasswordResponse(
        String message,
        long expiresInSeconds,
        String debugResetCode
) {
    public static ForgotPasswordResponse of(String message, long expiresInSeconds, String debugResetCode) {
        return new ForgotPasswordResponse(message, expiresInSeconds, debugResetCode);
    }
}
