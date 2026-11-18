package br.com.beyondtime.auth.dto;

public record DeleteAccountRequest(
        String password,
        Boolean confirmedViaDefensiveModal
) {
}
