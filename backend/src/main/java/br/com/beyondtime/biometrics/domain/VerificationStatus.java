package br.com.beyondtime.biometrics.domain;

public enum VerificationStatus {
    PENDING,
    PROCESSING,
    VERIFIED,
    REVIEW_REQUIRED,
    FAILED
}
