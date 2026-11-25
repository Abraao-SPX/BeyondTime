-- RF-07 + RF-11: Desbloqueio do Cofre E2EE por Reconhecimento Facial (Biometric Key Release)
-- Adiciona modo BIOMETRIC com segredo de cofre selado por Envelope Encryption (CHAT_VAULT_KEK)
-- e tabela de controle anti-replay para JTIs biometricos de uso unico.

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
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_used_biometric_unlock_jtis_used_at
    ON used_biometric_unlock_jtis (used_at);
