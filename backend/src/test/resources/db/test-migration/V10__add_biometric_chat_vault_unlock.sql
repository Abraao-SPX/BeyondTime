-- RF-07 + RF-11: Desbloqueio do Cofre E2EE por Reconhecimento Facial - H2 Test Migration

ALTER TABLE user_chat_keys
    ADD COLUMN IF NOT EXISTS unlock_mode VARCHAR(20) NOT NULL DEFAULT 'PIN'
        CHECK (unlock_mode IN ('BIOMETRIC', 'PIN'));

ALTER TABLE user_chat_keys
    ADD COLUMN IF NOT EXISTS sealed_vault_secret TEXT;

ALTER TABLE user_chat_keys
    ADD COLUMN IF NOT EXISTS sealed_vault_iv VARCHAR(128);

CREATE TABLE IF NOT EXISTS used_biometric_unlock_jtis (
    jti VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_used_biometric_unlock_jtis_used_at
    ON used_biometric_unlock_jtis (used_at);
