package br.com.beyondtime.chat.dto;

public record AntifraudCheckResponse(
        boolean alert,
        String riskLabel,
        double confidencePercent,
        String educationalTitle,
        String educationalMessage
) {
    public static AntifraudCheckResponse safe() {
        return new AntifraudCheckResponse(false, "NORMAL", 0.0, null, null);
    }
}
