-- RF11 — Sessões efêmeras de handoff PC -> Navegador do Celular via QR Code (TTL 5 min, uso único)
CREATE TABLE IF NOT EXISTS biometric_handoff_sessions (
    token VARCHAR(96) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_biometric_handoff_user_created
    ON biometric_handoff_sessions (user_id, created_at DESC);
