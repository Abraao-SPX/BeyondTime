-- RF11 — Garante unicidade de jti em verification_attempts (proteção anti-replay em nível de banco)
CREATE UNIQUE INDEX IF NOT EXISTS uq_verification_attempts_biometric_jti
    ON verification_attempts (biometric_service_jwt_id)
    WHERE biometric_service_jwt_id IS NOT NULL;
