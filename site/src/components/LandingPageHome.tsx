import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthViewId, ConnectionGoal } from '../types/auth';

interface LandingPageHomeProps {
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onOpenAuth: (targetView: AuthViewId) => void;
}

type IconName =
  | 'arrow-down'
  | 'arrow-right'
  | 'badge-check'
  | 'book'
  | 'check'
  | 'coffee'
  | 'external-link'
  | 'eye'
  | 'file-text'
  | 'fingerprint'
  | 'heart'
  | 'heart-handshake'
  | 'lock'
  | 'map-pin'
  | 'menu'
  | 'message'
  | 'moon'
  | 'shield-alert'
  | 'shield-check'
  | 'smartphone'
  | 'sparkles'
  | 'sun'
  | 'user-check'
  | 'users'
  | 'x';

function HomeIcon({
  name,
  className = 'home-icon',
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  const paths: Record<IconName, ReactNode> = {
    'arrow-down': <path d="M12 5v14m0 0-6-6m6 6 6-6" />,
    'arrow-right': <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
    'badge-check': (
      <>
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    book: (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
      </>
    ),
    check: <path d="m5 12 5 5L20 7" />,
    coffee: (
      <>
        <path d="M10 2v2m4-2v2" />
        <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
        <path d="M6 2v2" />
      </>
    ),
    'external-link': (
      <>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    'file-text': (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8m8 4H8m8 4H8" />
      </>
    ),
    fingerprint: (
      <>
        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
        <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
        <path d="M2 12a10 10 0 0 1 18-6" />
        <path d="M2 16h.01" />
        <path d="M21.8 16c.2-2 .131-5.354 0-6" />
        <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
        <path d="M8.65 22c.21-.66.45-1.32.57-2" />
        <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
      </>
    ),
    heart: (
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    ),
    'heart-handshake': (
      <>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.85.85 2.23.85 3.08 0l1.92-1.92" />
        <path d="m14 9.08 1.92 1.92c.85.85 2.23.85 3.08 0a2.17 2.17 0 0 0 0-3.08L16.04 5" />
      </>
    ),
    lock: (
      <>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    'map-pin': (
      <>
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    menu: (
      <>
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </>
    ),
    message: (
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    ),
    moon: (
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    ),
    'shield-alert': (
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    'shield-check': (
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    smartphone: (
      <>
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </>
    ),
    sparkles: (
      <>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </>
    ),
    'user-check': (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const STATS = [
  { value: '50+', label: 'Anos de idade mínima', desc: 'Comunidade exclusiva para quem já viveu grandes histórias' },
  { value: '100%', label: 'Foco em Sergipe', desc: 'Aracaju, Estância, Itabaiana e municípios conectados' },
  { value: '3 a 10', label: 'Hobbies em comum', desc: 'Afinidade real por interesses compartilhados' },
  { value: 'Zero', label: 'Golpes & Fakes', desc: 'Inteligência artificial defensiva e suporte humano' },
];

const MEMBER_STORIES = [
  {
    name: 'Helena, 62 anos',
    city: 'Aracaju (SE)',
    hobbies: ['Leitura', 'MPB', 'Café'],
    image: '/images/pessoa-madura.jpg',
    quote: 'Encontrei amigas para ir ao teatro e caminhar na Orla sem a pressão dos aplicativos tradicionais.',
  },
  {
    name: 'Carlos & Roberto, 66 anos',
    city: 'Praia Formosa (SE)',
    hobbies: ['Caminhada', 'Saúde', 'Passeios'],
    image: '/images/corrida-casal.png',
    quote: 'Ter companhia para se exercitar pela manhã transformou minha rotina. As conversas fluem naturalmente.',
  },
  {
    name: 'Lúcia & Tereza, 58 anos',
    city: 'Estância (SE)',
    hobbies: ['Artesanato', 'Feiras', 'Gastronomia'],
    image: '/images/encontros-selfie-compartilhada.png',
    quote: 'Descobrimos que morávamos perto e tínhamos os mesmos gostos. É como voltar a ter vizinhos de confiança.',
  },
  {
    name: 'Marta & Geraldo, 64 anos',
    city: 'Itabaiana (SE)',
    hobbies: ['Viagens', 'Natureza', 'Música'],
    image: '/images/hero-casal-viajante.png',
    quote: 'Um amor tranquilo e maduro, construído com respeito e afinidades reais sobre o que mais amamos fazer.',
  },
];

const STEPS = [
  {
    number: '01',
    icon: 'user-check' as IconName,
    title: 'Crie seu perfil no seu tempo',
    text: 'Preencha seu nome, sua cidade em Sergipe e escolha seus interesses favoritos em um passo a passo guiado e acolhedor.',
  },
  {
    number: '02',
    icon: 'heart' as IconName,
    title: 'Descubra afinidades reais',
    text: 'Sem deslizes acidentais. Explore perfis detalhados, confira afinidades em comum e converse no seu ritmo.',
  },
  {
    number: '03',
    icon: 'shield-check' as IconName,
    title: 'Converse com segurança',
    text: 'Troque mensagens em um ambiente monitorado por inteligência artificial, com suporte humano e proteção ativa contra golpes.',
  },
];

const SAFETY_PILLARS = [
  {
    icon: 'fingerprint' as IconName,
    title: 'Biometria Facial Anti-Fake',
    text: 'Cada foto é validada por IA para garantir que a pessoa do perfil é real, recente e autêntica.',
  },
  {
    icon: 'shield-alert' as IconName,
    title: 'Guardião Anti-Golpe',
    text: 'Classificador que detecta mensagens suspeitas e alertas contra pedidos de dinheiro, PIX ou dados bancários.',
  },
  {
    icon: 'heart-handshake' as IconName,
    title: 'Central de Suporte no WhatsApp',
    text: 'Linha direta (79) 98888-8888 com atendimento humanizado para tirar dúvidas a qualquer momento.',
  },
  {
    icon: 'lock' as IconName,
    title: 'Privacidade Total (LGPD)',
    text: 'Seu telefone e endereço exato nunca são divulgados. Você controla quem pode falar com você.',
  },
];

const TEAM_MEMBERS = [
  { name: 'José Guilherme', role: 'Líder Técnico e Desenvolvedor' },
  { name: 'Abraão Silva', role: 'Desenvolvedor' },
  { name: 'Paulo Rafael', role: 'Desenvolvedor' },
  { name: 'Brigitte Lara', role: 'Desenvolvedor' },
];

const TECH_STACK = [
  'React 18 + TypeScript',
  'Spring Boot 3 + Java 21',
  'PostgreSQL 16 (3FN)',
  'Python + FastAPI (ML)',
  'Docker + Nginx',
  'WCAG 2.1 AAA',
];

export function LandingPageHome({
  highContrast,
  onToggleHighContrast,
  onOpenAuth,
}: LandingPageHomeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ConnectionGoal>('Amizade');
  const [selectedCity, setSelectedCity] = useState('Aracaju (SE)');

  function handleStartRegistration() {
    onOpenAuth('register');
  }

  return (
    <div className={`home-shell ${highContrast ? 'high-contrast' : ''}`}>
      {/* Top Banner Humanizado */}
      <aside className="support-banner" aria-label="Central de suporte humanizado">
        <div className="support-banner__inner">
          <div className="support-banner__content">
            <span className="support-banner__icon" aria-hidden="true">
              <HomeIcon name="smartphone" className="home-icon" />
            </span>
            <p className="support-banner__text">
              <strong>Prefere falar com uma pessoa?</strong> Central de suporte e acolhimento 50+:
              <span className="support-banner__phone"> (79) 98888-8888</span>
            </p>
          </div>
          <div className="support-banner__actions">
            <a
              href="https://wa.me/5579988888888?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20BeyondTime"
              target="_blank"
              rel="noopener noreferrer"
              className="support-banner__btn-whatsapp"
            >
              Abrir WhatsApp
            </a>
          </div>
        </div>
      </aside>

      {/* Header Institucional */}
      <header className="home-header">
        <div className="home-container home-header__inner">
          <a href="#inicio" className="brand" aria-label="BeyondTime, página inicial">
            <img
              src={highContrast ? '/assets/beyondtime-brand-dark.png' : '/assets/beyondtime-brand-light.png'}
              alt="BeyondTime"
              className="brand__logo-img"
            />
          </a>

          {/* Navegação Desktop */}
          <nav className="home-nav" aria-label="Navegação principal">
            <ul className="home-nav__list">
              <li><a className="home-nav__link" href="#como-funciona">Como Funciona</a></li>
              <li><a className="home-nav__link" href="#comunidade">Quem Está Aqui</a></li>
              <li><a className="home-nav__link" href="#seguranca">Segurança</a></li>
              <li><a className="home-nav__link" href="#projeto">O Projeto</a></li>
            </ul>
          </nav>

          <div className="home-header__actions">
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={onToggleHighContrast}
              aria-pressed={highContrast}
              aria-label={highContrast ? 'Ativar modo claro' : 'Ativar modo noturno'}
              title={highContrast ? 'Modo claro' : 'Modo noturno'}
            >
              <HomeIcon name={highContrast ? 'sun' : 'moon'} className="home-icon" />
            </button>

            <button
              type="button"
              className="btn-home-outline"
              onClick={() => onOpenAuth('login')}
            >
              Entrar
            </button>

            <button
              type="button"
              className="btn-home-cta-primary btn-home-cta-primary--compact"
              onClick={handleStartRegistration}
            >
              <span>Criar conta</span>
              <HomeIcon name="arrow-right" className="home-icon" />
            </button>

            {/* Botão Menu Mobile */}
            <button
              type="button"
              className="btn-mobile-menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={mobileMenuOpen}
            >
              <HomeIcon name={mobileMenuOpen ? 'x' : 'menu'} className="home-icon--lg" />
            </button>
          </div>
        </div>

        {/* Menu Mobile Drawer */}
        {mobileMenuOpen && (
          <nav className="home-mobile-nav" aria-label="Menu móvel">
            <ul className="home-mobile-nav__list">
              <li>
                <a className="home-mobile-nav__link" href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>
                  Como Funciona
                </a>
              </li>
              <li>
                <a className="home-mobile-nav__link" href="#comunidade" onClick={() => setMobileMenuOpen(false)}>
                  Quem Está Aqui
                </a>
              </li>
              <li>
                <a className="home-mobile-nav__link" href="#seguranca" onClick={() => setMobileMenuOpen(false)}>
                  Segurança &amp; LGPD
                </a>
              </li>
              <li>
                <a className="home-mobile-nav__link" href="#projeto" onClick={() => setMobileMenuOpen(false)}>
                  O Projeto UNINASSAU
                </a>
              </li>
            </ul>
            <div className="home-mobile-nav__actions">
              <button
                type="button"
                className="btn btn--secondary btn--full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
              >
                Já tenho conta (Entrar)
              </button>
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleStartRegistration();
                }}
              >
                Criar minha conta 50+
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="conteudo" tabIndex={-1}>
        {/* ====================================================================
            1. HERO SECTION (Inspirado no HeartSync + Weav + Cofounder)
           ==================================================================== */}
        <section id="inicio" className="home-hero">
          <div className="home-hero__glow" aria-hidden="true" />
          <div className="home-container home-hero__grid">
            {/* Lado Esquerdo: Copywriting e Quick Match Finder */}
            <div className="home-hero__copy">
              <h1 className="home-hero__title">
                Sempre é tempo de viver novas histórias e conexões reais.
              </h1>

              <p className="home-hero__subtitle">
                Encontre amizades sinceras, companhias de passeio e novos relacionamentos em Sergipe, em uma comunidade segura feita exclusivamente para pessoas com 50 anos ou mais.
              </p>

              {/* Quick Matchmaking Finder (Inspirado no HeartSync) */}
              <div className="hero-finder-card">
                <div className="hero-finder-card__head">
                  <HomeIcon name="heart-handshake" className="home-icon home-icon--wine" />
                  <span className="hero-finder-card__caption">Encontre sua sintonia hoje mesmo:</span>
                </div>

                <div className="hero-finder-card__body">
                  <div className="hero-finder-card__field">
                    <label className="hero-finder-label">Eu busco:</label>
                    <div className="hero-finder-pills" role="radiogroup" aria-label="Objetivo desejado">
                      {(['Amizade', 'Relacionamento', 'Companhia'] as const).map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          role="radio"
                          aria-checked={selectedGoal === goal}
                          className={`hero-finder-pill ${selectedGoal === goal ? 'hero-finder-pill--active' : ''}`}
                          onClick={() => setSelectedGoal(goal)}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="hero-finder-card__field">
                    <label className="hero-finder-label" htmlFor="hero-city-select">Moro em:</label>
                    <select
                      id="hero-city-select"
                      className="hero-finder-select"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    >
                      <option value="Aracaju (SE)">Aracaju (SE)</option>
                      <option value="Estância (SE)">Estância (SE)</option>
                      <option value="Itabaiana (SE)">Itabaiana (SE)</option>
                      <option value="Lagarto (SE)">Lagarto (SE)</option>
                      <option value="São Cristóvão (SE)">São Cristóvão (SE)</option>
                      <option value="Barra dos Coqueiros (SE)">Barra dos Coqueiros (SE)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-home-cta-primary btn-home-cta-primary--finder"
                  onClick={handleStartRegistration}
                >
                  <span>Ver conexões compatíveis</span>
                  <HomeIcon name="arrow-right" className="home-icon" />
                </button>
              </div>

              <div className="home-hero__trust-points">
                <span>✓ Cadastro 100% gratuito</span>
                <span>✓ Sem deslizes acidentais</span>
                <span>✓ Suporte por telefone e WhatsApp</span>
              </div>
            </div>

            {/* Lado Direito: Composição Visual com Foto Reutilizada e Floating Cards */}
            <div className="home-hero__visual">
              <div className="home-hero__card">
                <img
                  src="/images/hero-casal-viajante.png"
                  alt="Casal maduro sorridente caminhando ao ar livre com mochilas"
                  className="home-hero__image"
                  loading="eager"
                />

                <div className="home-hero__card-footer">
                  <div>
                    <p className="home-hero__card-title">Uma boa conversa abre caminhos.</p>
                    <p className="home-hero__card-caption">Conexões no seu tempo, do seu jeito.</p>
                  </div>
                  <span className="home-icon-circle" aria-hidden="true">
                    <HomeIcon name="heart" className="home-icon--lg" filled />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            2. STRIP DE MÉTRICAS E PROVA SOCIAL (Inspirado no HeartSync + Cofounder)
           ==================================================================== */}
        <section className="home-stats-strip" aria-label="Números da comunidade">
          <div className="home-container">
            <div className="home-stats-grid">
              {STATS.map((stat) => (
                <div key={stat.label} className="home-stat-item">
                  <span className="home-stat-item__value">{stat.value}</span>
                  <strong className="home-stat-item__label">{stat.label}</strong>
                  <p className="home-stat-item__desc">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. QUEM ESTÁ AQUI: HISTÓRIAS E MEMBROS REAIS (Inspirado no HeartSync)
           ==================================================================== */}
        <section id="comunidade" className="home-section" aria-labelledby="comunidade-title">
          <div className="home-container">
            <div className="home-section__header">
              <span className="home-eyebrow">Pessoas reais de Sergipe</span>
              <h2 id="comunidade-title" className="home-section__title">
                Histórias que se encontram todos os dias.
              </h2>
              <p className="home-section__lead">
                Veja exemplos de conexões e amizades formadas por quem valoriza sinceridade, passeios tranquilos e boas conversas.
              </p>
            </div>

            <div className="home-stories-grid">
              {MEMBER_STORIES.map((story) => (
                <article key={story.name} className="story-card">
                  <div className="story-card__image-wrap">
                    <img
                      src={story.image}
                      alt={story.name}
                      className="story-card__image"
                      loading="lazy"
                    />
                    <span className="story-card__city-badge">
                      <HomeIcon name="map-pin" className="home-icon" />
                      {story.city}
                    </span>
                  </div>

                  <div className="story-card__content">
                    <h3 className="story-card__name">{story.name}</h3>
                    <div className="story-card__hobbies">
                      {story.hobbies.map((h) => (
                        <span key={h} className="story-card__hobby-pill">
                          {h}
                        </span>
                      ))}
                    </div>
                    <blockquote className="story-card__quote">
                      &ldquo;{story.quote}&rdquo;
                    </blockquote>
                  </div>
                </article>
              ))}
            </div>

            <div className="home-stories__cta">
              <button
                type="button"
                className="btn-home-cta-primary"
                onClick={handleStartRegistration}
              >
                <span>Fazer parte da comunidade</span>
                <HomeIcon name="arrow-right" className="home-icon" />
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. COMO FUNCIONA (Inspirado no Cofounder + Vessa)
           ==================================================================== */}
        <section id="como-funciona" className="home-section home-section--panel" aria-labelledby="como-funciona-title">
          <div className="home-container">
            <div className="home-section__header">
              <span className="home-eyebrow">Simplicidade e Respeito</span>
              <h2 id="como-funciona-title" className="home-section__title">
                Como funciona o BeyondTime
              </h2>
              <p className="home-section__lead">
                Criado especificamente para eliminar a confusão de outros apps: botões grandes, ritmo calmo e zero pegadinhas.
              </p>
            </div>

            <div className="home-steps-grid">
              {STEPS.map((step) => (
                <div key={step.number} className="home-step-card">
                  <div className="home-step-card__top">
                    <span className="home-step-card__number">{step.number}</span>
                    <span className="home-step-card__icon-box">
                      <HomeIcon name={step.icon} className="home-icon--xl home-icon--wine" />
                    </span>
                  </div>
                  <h3 className="home-card-title">{step.title}</h3>
                  <p className="home-card-text">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. SEGURANÇA E PROTEÇÃO CONTRA GOLPES (Painel de Confiança)
           ==================================================================== */}
        <section id="seguranca" className="home-section home-section--dark" aria-labelledby="seguranca-title">
          <div className="home-container">
            <div className="home-section__header home-section__header--dark">
              <span className="home-eyebrow home-eyebrow--dark">Proteção Ativa 24h</span>
              <h2 id="seguranca-title" className="home-section__title home-section__title--light">
                Sua tranquilidade é nossa prioridade absoluta.
              </h2>
              <p className="home-section__lead home-section__lead--light">
                Sabemos dos perigos e golpes na internet. Por isso, construímos uma blindagem digital para que você converse em paz.
              </p>
            </div>

            <div className="home-security-grid-4">
              {SAFETY_PILLARS.map((item) => (
                <div key={item.title} className="home-security-card">
                  <div className="home-security-card__icon-box">
                    <HomeIcon name={item.icon} className="home-icon--xl" />
                  </div>
                  <h3 className="home-security-card__title">{item.title}</h3>
                  <p className="home-security-card__text">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="home-security-footer-note">
              <HomeIcon name="shield-check" className="home-icon home-icon--wine" />
              <span>
                Central de atendimento com ligação gratuita e suporte humanizado por WhatsApp para qualquer situação.
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. BANNER DE CHAMADA FINAL (Inspirado no Vessa)
           ==================================================================== */}
        <section className="home-cta-banner" aria-labelledby="cta-banner-title">
          <div className="home-container">
            <div className="home-cta-banner__card">
              <span className="home-eyebrow">Dê o primeiro passo</span>
              <h2 id="cta-banner-title" className="home-cta-banner__title">
                Pronto(a) para conhecer pessoas que combinam com seu momento?
              </h2>
              <p className="home-cta-banner__subtitle">
                O cadastro leva menos de 2 minutos e é gratuito. Venha conversar, passear e viver novas histórias.
              </p>
              <div className="home-cta-banner__actions">
                <button
                  type="button"
                  className="btn-home-cta-primary btn-home-cta-primary--large"
                  onClick={handleStartRegistration}
                >
                  <span>Criar Minha Conta Grátis</span>
                  <HomeIcon name="arrow-right" className="home-icon" />
                </button>
                <button
                  type="button"
                  className="btn-home-cta-secondary"
                  onClick={() => onOpenAuth('login')}
                >
                  Já tenho conta (Entrar)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            7. FICHA TÉCNICA E GOVERNANÇA ACADÊMICA
           ==================================================================== */}
        <section id="projeto" className="home-section home-section--bordered" aria-labelledby="projeto-title">
          <div className="home-container">
            <div className="home-section__header">
              <span className="home-eyebrow">Projeto Acadêmico 2026</span>
              <h2 id="projeto-title" className="home-section__title">
                Construído com rigor, ética e carinho.
              </h2>
              <p className="home-section__lead">
                Projeto do curso de Análise e Desenvolvimento de Sistemas da UNINASSAU Aracaju (Edital nº 02/2026).
              </p>
            </div>

            <div className="home-project-grid">
              <div>
                <h3 className="home-card-title">Equipe de Desenvolvimento</h3>
                <ul className="home-team-grid">
                  {TEAM_MEMBERS.map((member) => (
                    <li key={member.name} className="home-team-card">
                      <HomeIcon name="user-check" className="home-icon home-icon--wine" />
                      <div>
                        <p className="home-team-card__name">{member.name}</p>
                        <p className="home-team-card__role">{member.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div id="ficha-tecnica" className="home-tech-block">
                <h3 className="home-card-title">Governança &amp; Arquitetura</h3>
                <p className="home-card-text">
                  Stack homologada, conformidade com a LGPD e testes integrados de ponta a ponta.
                </p>
                <ul className="home-tech-list" aria-label="Tecnologias do projeto">
                  {TECH_STACK.map((tech) => (
                    <li key={tech} className="home-tech-pill">{tech}</li>
                  ))}
                </ul>
                <p className="home-tech-caption">
                  UNINASSAU · Aracaju/SE · 2026
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Oficial */}
      <footer className="home-footer">
        <div className="home-container home-footer__grid">
          <section aria-labelledby="footer-brand">
            <a href="#inicio" aria-label="BeyondTime, voltar ao início" className="home-footer__brand">
              <img
                src="/assets/beyondtime-brand-dark.png"
                alt="BeyondTime"
                className="home-footer__logo-img"
              />
            </a>
            <p className="home-footer__tagline">
              Conexões reais que vão além do tempo.
            </p>
            <p className="home-footer__desc">
              Plataforma sergipana de amizades, companhias e afetos para pessoas com 50 anos ou mais.
            </p>
          </section>

          <nav aria-labelledby="footer-navigation">
            <h2 id="footer-navigation" className="home-footer__heading">Navegação</h2>
            <ul className="home-footer__links">
              <li><a className="home-footer__link" href="#como-funciona">Como Funciona</a></li>
              <li><a className="home-footer__link" href="#comunidade">Quem Está Aqui</a></li>
              <li><a className="home-footer__link" href="#seguranca">Segurança &amp; LGPD</a></li>
              <li><a className="home-footer__link" href="#projeto">O Projeto</a></li>
              <li><button type="button" className="home-footer__link-btn" onClick={() => onOpenAuth('login')}>Entrar</button></li>
              <li><button type="button" className="home-footer__link-btn" onClick={handleStartRegistration}>Criar conta</button></li>
            </ul>
          </nav>

          <section aria-labelledby="footer-governance">
            <h2 id="footer-governance" className="home-footer__heading">Transparência</h2>
            <a
              href="/docs/politica-de-governanca-beyondtime.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer__gov-btn"
            >
              <HomeIcon name="file-text" className="home-icon" />
              <span>Política de Governança (PDF)</span>
              <HomeIcon name="external-link" className="home-icon" />
            </a>
            <p className="home-footer__desc">Termos de Uso &amp; Proteção de Dados (LGPD)</p>
          </section>

          <section aria-labelledby="footer-academic">
            <h2 id="footer-academic" className="home-footer__heading">Projeto Acadêmico</h2>
            <p className="home-footer__desc">
              UNINASSAU Aracaju · ADS 2026.
            </p>
            <p className="home-footer__team-title">Equipe de Desenvolvimento</p>
            <p className="home-footer__desc">
              José Guilherme, Abraão Silva, Paulo Rafael e Brigitte Lara.
            </p>
          </section>
        </div>

        <div className="home-footer__bottom">
          <p className="home-container home-footer__copyright">
            © 2026 BeyondTime. Conexões 50+ em Sergipe. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
