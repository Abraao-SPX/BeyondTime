-- RF-08: Motivo opcional do bloqueio de contato (H2 test-migration)
ALTER TABLE user_blocks
    ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
