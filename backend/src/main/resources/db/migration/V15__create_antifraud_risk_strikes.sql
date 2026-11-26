-- RF-12: Reincidência Anti-Fraude (metadados sem texto claro) para congelamento cautelar
-- Privacidade E2EE: armazena apenas referências e classificação de risco, nunca o conteúdo da mensagem.

CREATE TABLE IF NOT EXISTS antifraud_risk_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL UNIQUE REFERENCES encrypted_messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_label VARCHAR(60) NOT NULL,
    confidence_percent NUMERIC(5,2) NOT NULL CHECK (confidence_percent BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_user_id <> recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_antifraud_strikes_sender_created
    ON antifraud_risk_strikes (sender_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_antifraud_strikes_conv_sender
    ON antifraud_risk_strikes (conversation_id, sender_user_id);
