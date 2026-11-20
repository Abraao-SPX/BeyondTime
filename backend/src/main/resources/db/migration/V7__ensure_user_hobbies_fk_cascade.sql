-- =========================================================================
-- V7 — Integridade Referencial 3FN: Cascade na exclusao de usuario (RF-04 / RF-14)
-- =========================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'user_hobbies'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_hobbies_user_id'
    ) THEN
        ALTER TABLE user_hobbies
            ADD CONSTRAINT fk_user_hobbies_user_id
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
