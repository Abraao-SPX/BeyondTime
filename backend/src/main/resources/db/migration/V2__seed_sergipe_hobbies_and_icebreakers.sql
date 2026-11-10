-- 1. ESTADO DE SERGIPE E MUNICÍPIOS PRINCIPAIS (RF02, RF05)
INSERT INTO states (uf, name) VALUES
    ('SE', 'Sergipe')
ON CONFLICT (uf) DO NOTHING;

INSERT INTO cities (state_id, name, is_metropolitan_aracaju, latitude, longitude)
SELECT s.id, c.name, c.is_metro, c.lat, c.lon
FROM states s
CROSS JOIN (VALUES
    ('Aracaju', TRUE, -10.947247, -37.073082),
    ('Nossa Senhora do Socorro', TRUE, -10.855094, -37.126095),
    ('São Cristóvão', TRUE, -11.014722, -37.206389),
    ('Barra dos Coqueiros', TRUE, -10.908889, -37.038611),
    ('Lagarto', FALSE, -10.917222, -37.650000),
    ('Itabaiana', FALSE, -10.685000, -37.425278),
    ('Estância', FALSE, -11.268333, -37.438333),
    ('Propriá', FALSE, -10.211111, -36.840278)
) AS c(name, is_metro, lat, lon)
WHERE s.uf = 'SE'
ON CONFLICT (state_id, name) DO NOTHING;

-- 2. BAIRROS PRINCIPAIS DE ARACAJU E REGIÃO METROPOLITANA (RF05)
INSERT INTO neighborhoods (city_id, name, zone)
SELECT c.id, b.name, b.zone
FROM cities c
CROSS JOIN (VALUES
    ('Atalaia', 'ZONA_SUL'),
    ('13 de Julho', 'ZONA_SUL'),
    ('Jardins', 'ZONA_SUL'),
    ('Grageru', 'ZONA_SUL'),
    ('Salgado Filho', 'ZONA_SUL'),
    ('Luzia', 'ZONA_SUL'),
    ('Farolândia', 'ZONA_SUL'),
    ('Inácio Barbosa', 'ZONA_SUL'),
    ('Aruana', 'EXPANSAO'),
    ('Mosqueiro', 'EXPANSAO'),
    ('Centro', 'CENTRO'),
    ('São José', 'CENTRO'),
    ('Siqueira Campos', 'ZONA_OESTE'),
    ('Santos Dumont', 'ZONA_NORTE'),
    ('Industrial', 'ZONA_NORTE')
) AS b(name, zone)
WHERE c.name = 'Aracaju'
ON CONFLICT (city_id, name) DO NOTHING;

-- 3. LOCAIS PÚBLICOS SEGUROS EM ARACAJU / SERGIPE PARA PRIMEIRO ENCONTRO (RF10)
INSERT INTO safe_public_places (city_id, name, category, description)
SELECT c.id, p.name, p.category, p.description
FROM cities c
CROSS JOIN (VALUES
    ('Parque da Sementeira', 'PARQUE', 'Área verde ampla, movimentada e segura para caminhada diurna e conversa tranquila.'),
    ('Orla de Atalaia', 'ORLA', 'Calçadão iluminado com quiosques, centros culturais e policiamento ostensivo.'),
    ('Museu da Gente Sergipana', 'MUSEU', 'Espaço cultural interativo no Centro com café acolhedor e ambiente climatizado.'),
    ('Centro de Arte e Cultura J. Inácio', 'CENTRO_CULTURAL', 'Feira de artesanato sergipano na Orla de Atalaia, ideal para passeio à tarde.'),
    ('Calçadão da Praia Formosa (13 de Julho)', 'ORLA', 'Mirante e calçadão tradicional para caminhada matinal e fim de tarde.')
) AS p(name, category, description)
WHERE c.name = 'Aracaju'
ON CONFLICT (city_id, name) DO NOTHING;

-- 4. TAXONOMIA DE HOBBIES E ESTILO DE VIDA (RF03)
INSERT INTO hobby_categories (code, name) VALUES
    ('MUSICA_DANCA', 'Música e Dança'),
    ('CULTURA_LAZER', 'Cultura, Leitura e Artes'),
    ('BEM_ESTAR', 'Ar Livre, Saúde e Bem-Estar'),
    ('GASTRONOMIA', 'Gastronomia e Convivência'),
    ('VIAGENS_SOCIAL', 'Viagens e Comunidade')
ON CONFLICT (code) DO NOTHING;

INSERT INTO hobbies (category_id, code, name, icon)
SELECT hc.id, h.code, h.name, h.icon
FROM (VALUES
    ('MUSICA_DANCA', 'MPB', 'Música Popular Brasileira (MPB)', '🎵'),
    ('MUSICA_DANCA', 'FORRO_TRADICIONAL', 'Forró Tradicional e Pé de Serra', '🪗'),
    ('MUSICA_DANCA', 'DANCA_SALAO', 'Dança de Salão', '💃'),
    ('CULTURA_LAZER', 'LEITURA', 'Leitura e Clubes do Livro', '📚'),
    ('CULTURA_LAZER', 'ARTESANATO', 'Artesanato e Feiras Culturais', '🧶'),
    ('CULTURA_LAZER', 'CINEMA_TEATRO', 'Cinema e Teatro', '🎭'),
    ('CULTURA_LAZER', 'FOTOGRAFIA', 'Fotografia e Memórias', '📷'),
    ('CULTURA_LAZER', 'JOGOS_TABULEIRO', 'Jogos de Mesa, Xadrez e Dominó', '♟️'),
    ('BEM_ESTAR', 'JARDINAGEM', 'Jardinagem e Plantas', '🌱'),
    ('BEM_ESTAR', 'CAMINHADA_ORLA', 'Caminhada na Orla e Parques', '🚶'),
    ('BEM_ESTAR', 'PRAIA_SOL', 'Praia e Banho de Mar', '🌊'),
    ('GASTRONOMIA', 'CULINARIA_REGIONAL', 'Culinária Regional Sergipana', '🍲'),
    ('GASTRONOMIA', 'CAFE_E_PROSA', 'Café da Tarde e Boa Conversa', '☕'),
    ('VIAGENS_SOCIAL', 'VIAGENS_PASSEIOS', 'Viagens e Passeios Culturais', '✈️'),
    ('VIAGENS_SOCIAL', 'VOLUNTARIADO', 'Ações Sociais e Voluntariado', '🤝')
) AS h(cat_code, code, name, icon)
JOIN hobby_categories hc ON hc.code = h.cat_code
ON CONFLICT (code) DO NOTHING;

-- 5. INTENÇÕES DE CONEXÃO
INSERT INTO connection_intents (code, label, icon) VALUES
    ('RELATIONSHIP', 'Relacionamento Sério', '❤️'),
    ('COMPANIONSHIP', 'Companhia para o Dia a Dia', '☕'),
    ('FRIENDSHIP', 'Amizade Verdadeira', '🤝'),
    ('CHAT', 'Conversar com Calma', '💬'),
    ('CULTURAL_OUTINGS', 'Companhia para Eventos e Passeios', '🎭'),
    ('TRAVEL_ACTIVITIES', 'Companhia para Viagens e Atividades', '✈️')
ON CONFLICT (code) DO NOTHING;

-- 6. REGISTRO DO MODELO DE ML ANJO DA GUARDA
INSERT INTO ml_models (name, version, algorithm, default_threshold) VALUES
    ('Anjo da Guarda — Classificador Antifraude BeyondTime', 'v1.0-tfidf-logreg', 'TF-IDF + LogisticRegression (scikit-learn)', 75.00)
ON CONFLICT (version) DO NOTHING;

-- 7. CATÁLOGO ESTÁTICO DE QUEBRA-GELO PARA FALLBACK LOCAL (< 20 PALAVRAS — RF10)
INSERT INTO icebreaker_templates (hobby_id, template_text, word_count)
SELECT h.id, t.texto, t.palavras
FROM (VALUES
    ('MPB', 'Olá {nome_b}! Vi que também aprecia MPB. Qual música mais marcou sua história?', 13),
    ('MPB', 'Oi {nome_b}! Que alegria encontrar alguém que gosta de MPB aqui em Sergipe!', 13),
    ('FORRO_TRADICIONAL', 'Olá {nome_b}! Vi que gosta de forró tradicional. Qual seu cantor sergipano favorito?', 13),
    ('DANCA_SALAO', 'Oi {nome_b}! Você também gosta de dançar? Uma boa música alegra qualquer tarde!', 13),
    ('JARDINAGEM', 'Olá {nome_b}! Vi que gosta de jardinagem. Quais plantas você cultiva em casa?', 13),
    ('JARDINAGEM', 'Oi {nome_b}! Que tal conversarmos sobre plantas e passeios no Parque da Sementeira?', 13),
    ('CULINARIA_REGIONAL', 'Olá {nome_b}! Vi que gosta de culinária regional. Qual seu prato sergipano preferido?', 13),
    ('CAMINHADA_ORLA', 'Oi {nome_b}! Você costuma caminhar na Orla de Atalaia ou no Parque da Sementeira?', 14),
    ('PRAIA_SOL', 'Olá {nome_b}! Também adoro o mar de Aracaju. Qual sua praia favorita por aqui?', 14),
    ('CAFE_E_PROSA', 'Oi {nome_b}! Nada melhor que um bom café e uma conversa tranquila, não acha?', 14),
    ('LEITURA', 'Olá {nome_b}! Vi que gosta de leitura. Que livro você recomendaria para uma tarde?', 14),
    ('ARTESANATO', 'Oi {nome_b}! Você já visitou a feira de artesanato lá na Orla de Atalaia?', 14),
    ('VIAGENS_PASSEIOS', 'Olá {nome_b}! Qual lugar de Sergipe ou do Nordeste você mais gostou de conhecer?', 14)
) AS t(hobby_code, texto, palavras)
JOIN hobbies h ON h.code = t.hobby_code
WHERE NOT EXISTS (
    SELECT 1 FROM icebreaker_templates it WHERE it.template_text = t.texto
);
