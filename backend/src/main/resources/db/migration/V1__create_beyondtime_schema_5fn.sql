CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Localização
CREATE TABLE IF NOT EXISTS states (
    id SMALLSERIAL PRIMARY KEY,
    uf CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    state_id SMALLINT NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    is_metropolitan_aracaju BOOLEAN NOT NULL DEFAULT FALSE,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    UNIQUE (state_id, name)
);

CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(40),
    UNIQUE (city_id, name)
);

CREATE TABLE IF NOT EXISTS safe_public_places (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    neighborhood_id INT REFERENCES neighborhoods(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (city_id, name)
);

-- 2. Autenticação e Contas
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255),
    birth_date DATE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN', 'MODERATOR')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED_PREVENTIVE', 'PENDING_DELETION', 'DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('GOOGLE', 'FACEBOOK', 'APPLE')),
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Perfil, Fotos e Acessibilidade
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    bio TEXT,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    neighborhood_id INT REFERENCES neighborhoods(id) ON DELETE SET NULL,
    audio_intro_key VARCHAR(255),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REVIEW_REQUIRED', 'FAILED')),
    verified_badge_50plus BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_key VARCHAR(255) NOT NULL UNIQUE,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'REMOVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, position)
);

CREATE TABLE IF NOT EXISTS accessibility_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    font_scale_percent SMALLINT NOT NULL DEFAULT 100
        CHECK (font_scale_percent BETWEEN 100 AND 160),
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'LIGHT'
        CHECK (theme_mode IN ('LIGHT', 'DARK', 'HIGH_CONTRAST_AAA')),
    high_contrast_aaa BOOLEAN NOT NULL DEFAULT FALSE,
    reduce_motion BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Hobbies, Intenções e Descoberta
CREATE TABLE IF NOT EXISTS hobby_categories (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS hobbies (
    id SERIAL PRIMARY KEY,
    category_id SMALLINT NOT NULL REFERENCES hobby_categories(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_hobbies (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hobby_id INT NOT NULL REFERENCES hobbies(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (profile_id, hobby_id)
);

CREATE TABLE IF NOT EXISTS connection_intents (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    label VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_intents (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    intent_id SMALLINT NOT NULL REFERENCES connection_intents(id) ON DELETE RESTRICT,
    PRIMARY KEY (profile_id, intent_id)
);

CREATE TABLE IF NOT EXISTS discovery_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    min_age SMALLINT NOT NULL DEFAULT 50 CHECK (min_age >= 50),
    max_age SMALLINT NOT NULL DEFAULT 99 CHECK (max_age >= min_age),
    max_distance_km INT NOT NULL DEFAULT 50 CHECK (max_distance_km > 0),
    only_verified_profiles BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_preference_intents (
    user_id UUID NOT NULL REFERENCES discovery_preferences(user_id) ON DELETE CASCADE,
    intent_id SMALLINT NOT NULL REFERENCES connection_intents(id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, intent_id)
);

-- 5. Match e Interações
CREATE TABLE IF NOT EXISTS profile_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(15) NOT NULL CHECK (action IN ('LIKE', 'PASS')),
    confirmed_via_modal BOOLEAN NOT NULL DEFAULT TRUE,
    affinity_score_snapshot NUMERIC(5,2) CHECK (affinity_score_snapshot BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id),
    CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    affinity_percentage NUMERIC(5,2) NOT NULL CHECK (affinity_percentage BETWEEN 0 AND 100),
    common_hobbies_count SMALLINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'UNMATCHED', 'FROZEN_PREVENTIVE', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_a_id, user_b_id),
    CHECK (user_a_id < user_b_id)
);

-- 6. Chat e Análise de Risco
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'FROZEN_PREVENTIVE', 'BLOCKED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT'
        CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'HELD_FOR_REVIEW'))
);

CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    version VARCHAR(50) NOT NULL UNIQUE,
    algorithm VARCHAR(80) NOT NULL,
    default_threshold NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_risk_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
    model_id INT NOT NULL REFERENCES ml_models(id) ON DELETE RESTRICT,
    risk_score NUMERIC(5,2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_label VARCHAR(60) NOT NULL,
    educational_alert_shown BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Quebra-Gelo (Icebreakers)
CREATE TABLE IF NOT EXISTS icebreaker_templates (
    id SERIAL PRIMARY KEY,
    hobby_id INT REFERENCES hobbies(id) ON DELETE CASCADE,
    safe_place_id INT REFERENCES safe_public_places(id) ON DELETE SET NULL,
    template_text VARCHAR(200) NOT NULL,
    word_count SMALLINT NOT NULL CHECK (word_count > 0 AND word_count < 20),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS icebreaker_requests_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(30) NOT NULL CHECK (source IN ('SPRING_AI_LLM', 'LOCAL_FALLBACK_RESILIENCE4J')),
    provider_model VARCHAR(60) NOT NULL,
    response_latency_ms INT NOT NULL CHECK (response_latency_ms >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Verificação, Bloqueios, Denúncias e LGPD
CREATE TABLE IF NOT EXISTS verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(40) NOT NULL DEFAULT 'FACIAL_LIVENESS_YUNET_SFACE',
    status VARCHAR(30) NOT NULL
        CHECK (status IN ('PENDING', 'PROCESSING', 'VERIFIED', 'REVIEW_REQUIRED', 'FAILED')),
    liveness_passed BOOLEAN,
    similarity_distance NUMERIC(6,4),
    biometric_service_jwt_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_via_modal BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_user_id, blocked_user_id),
    CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_ticket_code VARCHAR(40) NOT NULL UNIQUE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    reason_code VARCHAR(50) NOT NULL
        CHECK (reason_code IN ('MONEY_OR_PIX_REQUEST', 'FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'SPAM', 'OTHER')),
    description TEXT,
    preventive_freeze_applied BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN_AUDIT'
        CHECK (status IN ('OPEN_AUDIT', 'UNDER_HUMAN_REVIEW', 'CONFIRMED_VIOLATION', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CHECK (reporter_user_id <> reported_user_id)
);

CREATE TABLE IF NOT EXISTS lgpd_data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(30) NOT NULL
        CHECK (request_type IN ('EXPORT_DATA_JSON', 'DEFINITIVE_ACCOUNT_DELETION')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
    confirmed_via_defensive_modal BOOLEAN NOT NULL DEFAULT TRUE,
    sla_deadline_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Índices
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(city_id, neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verification_status, verified_badge_50plus);
CREATE INDEX IF NOT EXISTS idx_profile_hobbies_hobby ON profile_hobbies(hobby_id);
CREATE INDEX IF NOT EXISTS idx_interactions_to_user ON profile_interactions(to_user_id, action);
CREATE INDEX IF NOT EXISTS idx_matches_user_a_affinity ON matches(user_a_id, affinity_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user_b_affinity ON matches(user_b_id, affinity_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_icebreaker_templates_hobby ON icebreaker_templates(hobby_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON user_blocks(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_status ON moderation_reports(reported_user_id, status);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_user_status ON lgpd_data_requests(user_id, status);
