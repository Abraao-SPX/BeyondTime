-- RF11 — Garante unicidade de jti em verification_attempts (H2 test-migration)
CREATE UNIQUE INDEX IF NOT EXISTS uq_verification_attempts_biometric_jti
    ON verification_attempts (biometric_service_jwt_id);
