ALTER TABLE hobby_categories
    ADD COLUMN IF NOT EXISTS slug VARCHAR(60);
ALTER TABLE hobby_categories
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

ALTER TABLE hobby_categories
    ADD CONSTRAINT IF NOT EXISTS uk_hobby_categories_slug UNIQUE (slug);

ALTER TABLE hobbies
    ADD COLUMN IF NOT EXISTS slug VARCHAR(60);
ALTER TABLE hobbies
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hobbies
    ALTER COLUMN icon SET DEFAULT 'star';

UPDATE hobbies
SET slug = LOWER(REPLACE(code, '_', '-'))
WHERE slug IS NULL;

MERGE INTO hobbies (id, category_id, code, slug, name, icon, active)
KEY(code)
VALUES (100, (SELECT id FROM hobby_categories WHERE code = 'MUSICA_DANCA'), 'SERTANEJO', 'sertanejo', 'Música Sertaneja e Raiz', 'music', TRUE);

ALTER TABLE hobbies
    ALTER COLUMN slug SET NOT NULL;

ALTER TABLE hobbies
    ADD CONSTRAINT IF NOT EXISTS uk_hobbies_slug UNIQUE (slug);

CREATE TABLE IF NOT EXISTS user_hobbies (
    user_id UUID NOT NULL,
    hobby_id INT NOT NULL REFERENCES hobbies(id) ON DELETE RESTRICT,
    selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, hobby_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby_id ON user_hobbies(hobby_id);
