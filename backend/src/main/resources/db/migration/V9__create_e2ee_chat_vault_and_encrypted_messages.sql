-- RF-07: Chat Privado em Tempo Real (STOMP) com Criptografia Ponta a Ponta (E2EE)
-- Modelo B (Cofre Zero-Knowledge por PIN) + Midia Cifrada (Audio e Imagem)
-- Nenhuma mensagem em texto claro ou chave privada aberta e armazenada no servidor.

CREATE TABLE IF NOT EXISTS user_chat_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key_jwk TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    kdf_salt VARCHAR(128) NOT NULL,
    kdf_iv VARCHAR(128) NOT NULL,
    kdf_iterations INT NOT NULL DEFAULT 310000 CHECK (kdf_iterations >= 100000),
    key_algorithm VARCHAR(40) NOT NULL DEFAULT 'ECDH-P256',
    key_version INT NOT NULL DEFAULT 1 CHECK (key_version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encrypted_chat_media (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    uploader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_filename VARCHAR(120) NOT NULL UNIQUE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE', 'AUDIO')),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encrypted_chat_media_conv
    ON encrypted_chat_media (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS encrypted_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ciphertext TEXT NOT NULL,
    iv VARCHAR(128) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT'
        CHECK (message_type IN ('TEXT', 'IMAGE', 'AUDIO')),
    media_id UUID REFERENCES encrypted_chat_media(id) ON DELETE SET NULL,
    media_iv VARCHAR(128),
    media_mime_type VARCHAR(80),
    media_duration_seconds INT CHECK (media_duration_seconds IS NULL OR (media_duration_seconds >= 0 AND media_duration_seconds <= 600)),
    sender_key_version INT NOT NULL DEFAULT 1,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_encrypted_messages_conv_sent
    ON encrypted_messages (conversation_id, sent_at ASC);

CREATE INDEX IF NOT EXISTS idx_encrypted_messages_recipient_unread
    ON encrypted_messages (recipient_id, read_at);
