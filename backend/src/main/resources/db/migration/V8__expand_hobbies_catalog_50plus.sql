-- =========================================================================
-- V8 — Expansão da Taxonomia de Hobbies e Categorias 50+ (RF-03)
-- Adiciona novas categorias e hobbies para maior diversidade e afinidade.
-- =========================================================================

-- 1. Garante novas categorias no banco
INSERT INTO hobby_categories (code, name, slug, display_order) VALUES
    ('JOGOS_CONVIVENCIA', 'Jogos e Convivência', 'jogos-convivencia', 6)
ON CONFLICT (code) DO NOTHING;

-- 2. Insere novos hobbies com slug, name, icon e categoria associada
INSERT INTO hobbies (category_id, code, slug, name, icon, active)
SELECT hc.id, h.code, h.slug, h.name, h.icon, TRUE
FROM (VALUES
    -- Música e Dança
    ('MUSICA_DANCA', 'SAMBA_CHORO', 'samba-choro', 'Samba e Choro', '🎵'),
    ('MUSICA_DANCA', 'SERESTA_BOLERO', 'seresta-bolero', 'Seresta e Bolero', '🎶'),
    ('MUSICA_DANCA', 'CANTO_CORAL', 'canto-coral', 'Canto e Coral', '🎤'),

    -- Cultura, Leitura e Artes
    ('CULTURA_LAZER', 'PINTURA_DESENHO', 'pintura-desenho', 'Pintura e Desenho', '🎨'),
    ('CULTURA_LAZER', 'HISTORIA_GENEALOGIA', 'historia-genealogia', 'História e Memórias de Família', '📜'),

    -- Ar Livre, Saúde e Bem-Estar
    ('BEM_ESTAR', 'PILATES_ALONGAMENTO', 'pilates-alongamento', 'Pilates e Alongamento', '🧘'),
    ('BEM_ESTAR', 'HIDROGINASTICA', 'hidroginastica', 'Hidroginástica e Natação', '🏊'),
    ('BEM_ESTAR', 'PASSEIO_PETS', 'passeio-pets', 'Passeio com Animais de Estimação', '🐕'),
    ('BEM_ESTAR', 'CICLISMO_PASSEIO', 'ciclismo-passeio', 'Passeios de Bicicleta', '🚲'),

    -- Gastronomia e Convivência
    ('GASTRONOMIA', 'CONFEITARIA_PAES', 'confeitaria-paes', 'Confeitaria e Pães Artesanais', '🍞'),
    ('GASTRONOMIA', 'ENCONTROS_FAMILIA', 'encontros-familia', 'Almoço em Família e Amigos', '🍽️'),
    ('GASTRONOMIA', 'CHAS_ERVAS', 'chas-ervas', 'Chás e Plantas Medicinais', '🍵'),
    ('GASTRONOMIA', 'CHURRASCO_PETISCOS', 'churrasco-petiscos', 'Churrasco e Petiscos', '🥩'),

    -- Viagens e Passeios
    ('VIAGENS_SOCIAL', 'TURISMO_HISTORICO', 'turismo-historico', 'Passeios Históricos e Cidades Coloniais', '🏛️'),
    ('VIAGENS_SOCIAL', 'ECOTURISMO_NATUREZA', 'ecoturismo-natureza', 'Ecoturismo e Contato com a Natureza', '🌿'),
    ('VIAGENS_SOCIAL', 'MERCADOS_FEIRAS', 'mercados-feiras', 'Feiras de Artesanato e Mercados Centrais', '🛍️'),
    ('VIAGENS_SOCIAL', 'TURISMO_RELIGIOSO', 'turismo-religioso', 'Turismo Religioso e Romarias', '⛪'),

    -- Jogos e Convivência
    ('JOGOS_CONVIVENCIA', 'JOGOS_CARTAS', 'jogos-cartas', 'Baralho, Buraco e Tranca', '🃏'),
    ('JOGOS_CONVIVENCIA', 'XADREZ_DAMAS', 'xadrez-damas', 'Xadrez e Damas', '♟️'),
    ('JOGOS_CONVIVENCIA', 'RODAS_CONVERSA', 'rodas-conversa', 'Rodas de Conversa e Novos Amigos', '💬')
) AS h(cat_code, code, slug, name, icon)
JOIN hobby_categories hc ON hc.code = h.cat_code
ON CONFLICT (code) DO NOTHING;
