package br.com.beyondtime.chat.dto;

public record AntifraudCheckResponse(
        boolean alert,
        String riskLabel,
        double confidencePercent,
        String educationalTitle,
        String educationalMessage,
        int strikeCountInConversation,
        boolean escalatedWarning,
        boolean senderPreventivelySuspended,
        String auditTicketCode
) {
    public AntifraudCheckResponse(
            boolean alert,
            String riskLabel,
            double confidencePercent,
            String educationalTitle,
            String educationalMessage) {
        this(alert, riskLabel, confidencePercent, educationalTitle, educationalMessage, 0, false, false, null);
    }

    public static AntifraudCheckResponse safe() {
        return new AntifraudCheckResponse(false, "NORMAL", 0.0, null, null, 0, false, false, null);
    }
}
