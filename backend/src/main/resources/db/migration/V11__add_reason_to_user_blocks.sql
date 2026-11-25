-- RF-08: Motivo opcional do bloqueio de contato (compatível com Web e Mobile)
ALTER TABLE user_blocks
    ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
