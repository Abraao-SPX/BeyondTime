-- =========================================================================
-- V12 — Índice composto para paginação eficiente por cursor no chat E2EE (AUD-013)
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_encrypted_messages_conv_sent_desc_id
    ON encrypted_messages (conversation_id, sent_at DESC, id DESC);
