-- =========================================================================
-- V5 — Evolucao 3FN da Taxonomia de Hobbies (RF-03 / Issue #8)
-- Mantem 100% de compatibilidade com V1, V2, V3 e V4
-- =========================================================================

-- 1. Evolucao de hobby_categories (id, slug UNIQUE, name, display_order)
ALTER TABLE hobby_categories
    ADD COLUMN IF NOT EXISTS slug VARCHAR(60),
    ADD COLUMN IF NOT EXISTS display_order SMALLINT NOT NULL DEFAULT 1;

UPDATE hobby_categories
SET slug = LOWER(REPLACE(code, '_', '-'))
WHERE slug IS NULL;

UPDATE hobby_categories SET display_order = 1 WHERE code = 'MUSICA_DANCA';
UPDATE hobby_categories SET display_order = 2 WHERE code = 'CULTURA_LAZER';
UPDATE hobby_categories SET display_order = 3 WHERE code = 'BEM_ESTAR';
UPDATE hobby_categories SET display_order = 4 WHERE code = 'GASTRONOMIA';
UPDATE hobby_categories SET display_order = 5 WHERE code = 'VIAGENS_SOCIAL';

ALTER TABLE hobby_categories
    ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_hobby_categories_slug'
    ) THEN
        ALTER TABLE hobby_categories
            ADD CONSTRAINT uk_hobby_categories_slug UNIQUE (slug);
    END IF;
END $$;

-- 2. Evolucao de hobbies (id, category_id FK, slug UNIQUE, name, active BOOLEAN)
ALTER TABLE hobbies
    ADD COLUMN IF NOT EXISTS slug VARCHAR(60),
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE hobbies
    ALTER COLUMN icon SET DEFAULT 'star';

UPDATE hobbies
SET slug = LOWER(REPLACE(code, '_', '-'))
WHERE slug IS NULL;

INSERT INTO hobbies (category_id, code, slug, name, icon, active)
SELECT hc.id, 'SERTANEJO', 'sertanejo', 'Música Sertaneja e Raiz', 'music', TRUE
FROM hobby_categories hc
WHERE hc.code = 'MUSICA_DANCA'
ON CONFLICT (code) DO NOTHING;

ALTER TABLE hobbies
    ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_hobbies_slug'
    ) THEN
        ALTER TABLE hobbies
            ADD CONSTRAINT uk_hobbies_slug UNIQUE (slug);
    END IF;
END $$;

-- 3. Tabela Associativa N:N em 3FN (user_hobbies: user_id, hobby_id, selected_at)
CREATE TABLE IF NOT EXISTS user_hobbies (
    user_id UUID NOT NULL,
    hobby_id INT NOT NULL REFERENCES hobbies(id) ON DELETE RESTRICT,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, hobby_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby_id ON user_hobbies(hobby_id);
