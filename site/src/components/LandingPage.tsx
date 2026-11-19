import { useState } from 'react';
import type { AuthViewId, LegalPageId } from '../types/auth';

type IntentKey = 'amizade' | 'companhia' | 'relacionamento';

interface ConnectionPreview {
  number: string;
  title: string;
  description: string;
  features: string[];
  name: string;
  bio: string;
  image: string;
  alt: string;
  interests: string[];
}

const CONNECTIONS: Record<IntentKey, ConnectionPreview> = {
  amizade: {
    number: '01 / 03',
    title: 'Aquela conversa que faz o dia mais leve.',
    description:
      'Trocar histórias, descobrir um gosto em comum ou simplesmente ter alguém para perguntar: “Como foi seu dia?”. Uma boa amizade pode começar assim.',
    features: [
      'Interesses que aproximam',
      'Conversas com espaço para ser você',
      'Conexões sem pressa',
    ],
    name: 'Helena, 58',
    bio: 'Uma boa conversa sempre cabe no dia.',
    image: 'assets/perfil-helena.svg',
    alt: 'Ilustração de Helena, personagem de um perfil demonstrativo.',
    interests: ['Jardinagem', 'Um bom café', 'MPB'],
  },
  companhia: {
    number: '02 / 03',
    title: 'O passeio de sempre. Uma nova companhia.',
    description:
      'Uma caminhada no parque, um filme no domingo ou aquela viagem que ficou para depois. Compartilhar pequenos planos pode transformar a rotina.',
    features: [
      'Pessoas que gostam do que você gosta',
      'Mais possibilidades para o dia a dia',
      'Liberdade para escolher sua companhia',
    ],
    name: 'Marcos, 62',
    bio: 'Sempre cabe mais alguém na caminhada.',
    image: 'assets/perfil-marcos.svg',
    alt: 'Ilustração de Marcos, personagem de um perfil demonstrativo.',
    interests: ['Caminhadas', 'Cinema', 'Viagens'],
  },
  relacionamento: {
    number: '03 / 03',
    title: 'O coração também gosta de novos capítulos.',
    description:
      'Conhecer alguém com quem dividir carinho, planos e boas conversas. Com respeito à sua história e espaço para descobrir o que vem pela frente.',
    features: [
      'Intenções claras desde o começo',
      'Afinidade para além da aparência',
      'Tempo para conhecer de verdade',
    ],
    name: 'Lúcia, 56',
    bio: 'Boas histórias merecem novos capítulos.',
    image: 'assets/perfil-lucia.svg',
    alt: 'Ilustração de Lúcia, personagem de um perfil demonstrativo.',
    interests: ['Dança', 'Livros', 'Cozinhar'],
  },
};

interface LandingPageProps {
  isAuthenticated: boolean;
  onOpenAuth: (targetView: AuthViewId) => void;
  onOpenLegalPage?: (page: LegalPageId) => void;
}

export function LandingPage({
  isAuthenticated,
  onOpenAuth,
  onOpenLegalPage,
}: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentKey>('amizade');
  const currentConnection = CONNECTIONS[activeIntent];
  const currentYear = new Date().getFullYear();

  function handleNavAction(targetView: AuthViewId) {
    setMenuOpen(false);
    onOpenAuth(targetView);
  }

  return (
    <div className="landing-root">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <svg
        className="icon-library"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <symbol id="arrow" viewBox="0 0 24 24">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </symbol>
        <symbol id="arrow-up" viewBox="0 0 24 24">
          <path d="M6 18 18 6M6 6h12v12" />
        </symbol>
        <symbol id="heart" viewBox="0 0 24 24">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </symbol>
        <symbol id="leaf" viewBox="0 0 24 24">
          <path d="M20 3C9 2 3 7 5 14c2 7 14 7 15-11ZM4 21 15 10" />
        </symbol>
        <symbol id="coffee" viewBox="0 0 24 24">
          <path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm14 1h2a3 3 0 0 1 0 6h-2M7 2v2m5-2v2M2 23h17" />
        </symbol>
        <symbol id="chat" viewBox="0 0 24 24">
          <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.3-5a9 9 0 1 1 16.7-4.5Z" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
        </symbol>
        <symbol id="shield" viewBox="0 0 24 24">
          <path d="m12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6l9-4Z" />
          <path d="m8 12 3 3 5-6" />
        </symbol>
        <symbol id="sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </symbol>
        <symbol id="check" viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6" />
        </symbol>
        <symbol id="spark" viewBox="0 0 24 24">
          <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z" />
        </symbol>
        <symbol id="lock" viewBox="0 0 24 24">
          <rect x="4" y="10" width="16" height="11" rx="3" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
        </symbol>
      </svg>

      <header className="lp-header">
        <div className="container header-inner">
          <a
            className="lp-brand"
            href="#inicio"
            aria-label="BeyondTime — início"
          >
            <img src="assets/favicon.svg" width={38} height={38} alt="" />
            <span>
              Beyond<span className="brand-light">Time</span>
              <span className="brand-dot">.</span>
            </span>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-controls="main-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
          </button>

          <nav
            className={`main-nav${menuOpen ? ' is-open' : ''}`}
            id="main-nav"
            aria-label="Navegação principal"
          >
            <a href="#conexoes" onClick={() => setMenuOpen(false)}>
              Nossa proposta
            </a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <a href="#seguranca" onClick={() => setMenuOpen(false)}>
              Segurança
            </a>

            <div className="nav-auth-actions">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="nav-cta nav-cta--primary"
                  onClick={() => handleNavAction('login')}
                >
                  Meu painel
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow-up" />
                  </svg>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="nav-cta"
                    onClick={() => handleNavAction('login')}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className="nav-cta nav-cta--primary"
                    onClick={() => handleNavAction('register')}
                  >
                    Criar conta
                    <svg className="icon" aria-hidden="true">
                      <use href="#arrow-up" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <section
          className="hero container"
          id="inicio"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="little-sun" aria-hidden="true">
                ✳
              </span>{' '}
              NOVAS CONEXÕES. NO SEU TEMPO.
            </p>
            <h1 id="hero-title">
              Boas histórias
              <br />
              não têm <em>idade.</em>
            </h1>
            <p className="hero-description">
              Um café, uma conversa, um novo começo.
              <br />
              Conheça o BeyondTime: um lugar pensado para criar conexões de
              verdade depois dos 50.
            </p>
            <div className="hero-actions">
              <div className="hero-actions-row">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => onOpenAuth('register')}
                >
                  Encontre novas possibilidades{' '}
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => onOpenAuth('login')}
                >
                  Já tenho conta (Entrar)
                </button>
              </div>
              <a className="text-link" href="#como-funciona">
                No seu ritmo, do seu jeito <span aria-hidden="true">↘</span>
              </a>
            </div>
            <div className="hero-note">
              <div className="mini-portraits" aria-hidden="true">
                <img
                  src="assets/perfil-helena.svg"
                  alt=""
                  width={44}
                  height={44}
                />
                <img
                  src="assets/perfil-marcos.svg"
                  alt=""
                  width={44}
                  height={44}
                />
                <img
                  src="assets/perfil-lucia.svg"
                  alt=""
                  width={44}
                  height={44}
                />
              </div>
              <p>
                Para quem tem muita vida
                <br />
                <strong>e novas histórias pela frente.</strong>
              </p>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-note">
              <svg className="icon" aria-hidden="true">
                <use href="#leaf" />
              </svg>{' '}
              Sempre é tempo de florescer.
            </div>
            <img
              className="hero-illustration"
              src="assets/encontro.svg"
              width={760}
              height={800}
              alt="Ilustração de duas pessoas maduras sorrindo e conversando em uma mesa de café ao ar livre."
            />
            <div className="floating-conversation">
              <span className="conversation-icon">
                <svg className="icon" aria-hidden="true">
                  <use href="#coffee" />
                </svg>
              </span>
              <div>
                <span>PODE COMEÇAR COM UM SIMPLES</span>
                <p>“Vamos tomar um café?”</p>
              </div>
              <span className="conversation-heart" aria-hidden="true">
                ♡
              </span>
            </div>
            <span className="art-caption">
              Gente, encontros e o que faz a vida valer.
            </span>
          </div>
          <span className="hero-page-note">
            UM NOVO CAPÍTULO ESTÁ SENDO ESCRITO <span aria-hidden="true">↓</span>
          </span>
        </section>

        <div className="values-band" aria-label="Princípios do BeyondTime">
          <div className="container values-inner">
            <span>
              <svg className="icon" aria-hidden="true">
                <use href="#heart" />
              </svg>{' '}
              Afinidade antes de tudo
            </span>
            <i aria-hidden="true">✳</i>
            <span>
              <svg className="icon" aria-hidden="true">
                <use href="#leaf" />
              </svg>{' '}
              Respeito ao seu tempo
            </span>
            <i aria-hidden="true">✳</i>
            <span>
              <svg className="icon" aria-hidden="true">
                <use href="#shield" />
              </svg>{' '}
              Cuidado em cada conexão
            </span>
          </div>
        </div>

        <section
          className="section container connections"
          id="conexoes"
          aria-labelledby="connections-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">HÁ MUITAS FORMAS DE ESTAR JUNTO</p>
              <h2 id="connections-title">
                O próximo capítulo
                <br />
                pode ser <em>compartilhado.</em>
              </h2>
            </div>
            <p>
              Você escolhe o que faz sentido para a sua vida. A nossa proposta é
              aproximar pessoas que procuram o mesmo que você.
            </p>
          </div>

          <div
            className="intent-tabs"
            role="tablist"
            aria-label="Explore os tipos de conexão"
          >
            <button
              id="tab-amizade"
              className={`intent-tab${activeIntent === 'amizade' ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeIntent === 'amizade'}
              aria-controls="intent-panel"
              onClick={() => setActiveIntent('amizade')}
            >
              <svg className="icon" aria-hidden="true">
                <use href="#chat" />
              </svg>{' '}
              Uma boa amizade
            </button>
            <button
              id="tab-companhia"
              className={`intent-tab${activeIntent === 'companhia' ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeIntent === 'companhia'}
              aria-controls="intent-panel"
              onClick={() => setActiveIntent('companhia')}
            >
              <svg className="icon" aria-hidden="true">
                <use href="#coffee" />
              </svg>{' '}
              Companhia para a vida
            </button>
            <button
              id="tab-relacionamento"
              className={`intent-tab${activeIntent === 'relacionamento' ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeIntent === 'relacionamento'}
              aria-controls="intent-panel"
              onClick={() => setActiveIntent('relacionamento')}
            >
              <svg className="icon" aria-hidden="true">
                <use href="#heart" />
              </svg>{' '}
              Um novo amor
            </button>
          </div>

          <div
            className="intent-panel"
            id="intent-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeIntent}`}
            tabIndex={0}
          >
            <div className="intent-copy">
              <span className="panel-number" aria-hidden="true">
                {currentConnection.number}
              </span>
              <h3 id="intent-title">{currentConnection.title}</h3>
              <p id="intent-description">{currentConnection.description}</p>
              <ul className="check-list" id="intent-features">
                {currentConnection.features.map((feature) => (
                  <li key={feature}>
                    <svg className="icon" aria-hidden="true">
                      <use href="#check" />
                    </svg>{' '}
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="profile-preview">
              <div className="profile-image-wrap">
                <img
                  id="profile-image"
                  src={currentConnection.image}
                  width={400}
                  height={440}
                  alt={currentConnection.alt}
                  loading="lazy"
                />
                <span className="profile-caption">PERFIL ILUSTRATIVO</span>
              </div>
              <div className="profile-summary">
                <div>
                  <h4 id="profile-name">{currentConnection.name}</h4>
                  <p id="profile-bio">{currentConnection.bio}</p>
                </div>
                <span className="profile-flower" aria-hidden="true">
                  ✳
                </span>
              </div>
              <div className="profile-interests" id="profile-interests">
                {currentConnection.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </div>

            <div className="affinity-note">
              <svg className="icon" aria-hidden="true">
                <use href="#spark" />
              </svg>
              <span>
                O primeiro assunto?
                <br />
                <strong>Vocês já têm em comum.</strong>
              </span>
            </div>
          </div>
          <p className="section-footnote">
            Uma prévia da experiência que estamos construindo. Perfis e
            situações são ilustrativos.
          </p>
        </section>

        <section
          className="how-section"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <div className="container">
            <div className="how-heading">
              <div>
                <p className="eyebrow">SIMPLES DESDE O PRIMEIRO OLÁ</p>
                <h2 id="how-title">
                  Menos complicação.
                  <br />
                  <em>Mais conexão.</em>
                </h2>
              </div>
              <p>
                Estamos desenhando uma experiência clara e acolhedora, para que
                a tecnologia deixe espaço para o que importa: as pessoas.
              </p>
            </div>
            <div className="steps">
              <article className="step">
                <div className="step-top">
                  <span>01</span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#sun" />
                  </svg>
                </div>
                <h3>Conte um pouco de você</h3>
                <p>
                  Seus interesses, suas histórias e o que você busca. Um perfil
                  que vai além da foto.
                </p>
              </article>
              <article className="step">
                <div className="step-top">
                  <span>02</span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#leaf" />
                  </svg>
                </div>
                <h3>Encontre afinidades</h3>
                <p>
                  A proposta é apresentar pessoas com interesses e intenções que
                  combinam com os seus.
                </p>
              </article>
              <article className="step">
                <div className="step-top">
                  <span>03</span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#chat" />
                  </svg>
                </div>
                <h3>Dê espaço à conversa</h3>
                <p>
                  Quando o interesse for mútuo, um primeiro olá pode abrir a
                  porta para uma boa história.
                </p>
              </article>
            </div>
            <div className="how-bottom">
              <span>Sem corrida. Sem obrigação. No seu tempo.</span>
              <svg className="icon" aria-hidden="true">
                <use href="#heart" />
              </svg>
            </div>
          </div>
        </section>

        <section
          className="section container safety"
          id="seguranca"
          aria-labelledby="safety-title"
        >
          <div className="safety-art" aria-hidden="true">
            <div className="safety-orbit orbit-one" />
            <div className="safety-orbit orbit-two" />
            <span className="orbit-spark spark-one">✳</span>
            <span className="orbit-spark spark-two">✳</span>
            <div className="safety-center">
              <svg viewBox="0 0 100 112" fill="none">
                <path
                  d="m50 6 39 17v27c0 25-25 47-39 55C36 97 11 75 11 50V23L50 6Z"
                  fill="#214d40"
                />
                <path
                  d="M50 26c-10-12-27-2-21 11 6 12 21 21 21 21s15-9 21-21c6-13-11-23-21-11Z"
                  fill="#f3ead3"
                />
                <path
                  d="m35 77 9 9 21-22"
                  stroke="#e5bc8b"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="safety-tag tag-top">
              <svg className="icon">
                <use href="#lock" />
              </svg>{' '}
              Sua privacidade importa.
            </div>
            <div className="safety-tag tag-bottom">
              <svg className="icon">
                <use href="#heart" />
              </svg>{' '}
              Sua autonomia também.
            </div>
            <span className="safety-handwriting">
              Cuidar também é conectar.
            </span>
          </div>

          <div className="safety-copy">
            <p className="eyebrow">CONFIANÇA SE CONSTRÓI COM CUIDADO</p>
            <h2 id="safety-title">
              Para conhecer alguém,
              <br />
              você precisa se sentir
              <br />
              <em>à vontade.</em>
            </h2>
            <p>
              Segurança e respeito fazem parte do que queremos construir, desde
              o primeiro contato.
            </p>
            <div className="safety-points">
              <article>
                <span className="point-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#shield" />
                  </svg>
                </span>
                <div>
                  <h3>Verificação com transparência</h3>
                  <p>
                    Estamos desenvolvendo a verificação de perfil. Ela será um
                    apoio, sem prometer que um perfil está livre de riscos.
                  </p>
                </div>
              </article>
              <article>
                <span className="point-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#chat" />
                  </svg>
                </span>
                <div>
                  <h3>Uma ajuda para reconhecer sinais</h3>
                  <p>
                    O “Anjo da Guarda” é nossa proposta de alertas educativos
                    sobre mensagens suspeitas, sem acusações automáticas.
                  </p>
                </div>
              </article>
              <article>
                <span className="point-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#lock" />
                  </svg>
                </span>
                <div>
                  <h3>Você no controle</h3>
                  <p>
                    Bloqueio, denúncia e escolhas de privacidade estão previstos
                    para ajudar você a decidir com quem interagir.
                  </p>
                </div>
              </article>
            </div>
            <p className="safety-note">
              Recursos em desenvolvimento. Nenhuma tecnologia elimina todos os
              riscos.
            </p>
          </div>
        </section>

        <section className="manifesto">
          <div className="container manifesto-inner">
            <span aria-hidden="true">“</span>
            <h2>
              A vida não para de surpreender.
              <br />E a gente não precisa
              <br />
              <em>vivê-la sozinho.</em>
            </h2>
            <p>ESSA É A IDEIA POR TRÁS DO BEYONDTIME.</p>
            <svg className="icon" aria-hidden="true">
              <use href="#leaf" />
            </svg>
          </div>
        </section>

        <section
          className="section container faq-section"
          id="duvidas"
          aria-labelledby="faq-title"
        >
          <div className="faq-heading">
            <p className="eyebrow">VAMOS CONVERSAR?</p>
            <h2 id="faq-title">
              Algumas dúvidas,
              <br />
              <em>boas respostas.</em>
            </h2>
            <p>Conheça um pouco mais da proposta.</p>
          </div>
          <div className="faq-list">
            <details open>
              <summary>
                O BeyondTime é só para namoro?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Não. A proposta também inclui amizade, companhia e pessoas para
                compartilhar interesses e atividades. Cada pessoa poderá dizer o
                que procura, respeitando suas próprias escolhas.
              </p>
            </details>
            <details>
              <summary>
                Para quem o aplicativo está sendo pensado?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                O BeyondTime está sendo desenvolvido principalmente para pessoas
                com 50 anos ou mais. Queremos uma experiência simples, legível e
                respeitosa, com espaço para diferentes histórias e níveis de
                familiaridade com a tecnologia.
              </p>
            </details>
            <details>
              <summary>
                Já posso criar minha conta pelo site?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Sim! Você já pode clicar em “Criar conta” ou “Entrar” no topo da
                página para cadastrar seu perfil 50+ em Sergipe e escolher seus
                interesses.
              </p>
            </details>
            <details>
              <summary>
                Como a segurança vai funcionar?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Contamos com verificação de perfil 50+, orientações de
                segurança, bloqueio, denúncia e alertas educativos em conformidade
                com a LGPD.
              </p>
            </details>
          </div>
        </section>

        <section
          className="app-section container"
          id="aplicativo"
          aria-labelledby="app-title"
        >
          <div className="app-callout">
            <div className="app-copy">
              <p className="launch-status">
                <span />
                <span>PLATAFORMA BEYONDTIME 50+</span>
              </p>
              <h2 id="app-title">
                Ainda há tanta
                <br />
                coisa boa <em>para viver.</em>
              </h2>
              <p>
                Prepare seu perfil, escolha seus interesses em Sergipe e comece
                novas histórias no seu tempo. Que bom ter você por aqui.
              </p>
              <button
                type="button"
                className="button button-cream"
                onClick={() => onOpenAuth('register')}
              >
                Criar minha conta agora{' '}
                <svg className="icon" aria-hidden="true">
                  <use href="#arrow-up" />
                </svg>
              </button>
              <span className="launch-hint">
                Cadastro exclusivo para pessoas com 50 anos ou mais.
              </span>
            </div>
            <div className="app-art" aria-hidden="true">
              <div className="app-stamp">
                <span>NOVOS COMEÇOS</span>
                <svg className="icon">
                  <use href="#sun" />
                </svg>
                <span>NÃO TÊM IDADE</span>
              </div>
              <div className="large-brand-mark">
                b<span>t</span>
                <i>♡</i>
              </div>
              <span className="app-art-caption">
                o melhor da vida é compartilhar.
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="container">
          <div className="footer-main">
            <div>
              <a
                className="lp-brand"
                href="#inicio"
                aria-label="BeyondTime — voltar ao início"
              >
                <img src="assets/favicon.svg" width={34} height={34} alt="" />
                <span>
                  Beyond<span className="brand-light">Time</span>
                  <span className="brand-dot">.</span>
                </span>
              </a>
              <p>Conexões reais não têm idade.</p>
            </div>
            <nav aria-label="Navegação do rodapé">
              <a href="#conexoes">Nossa proposta</a>
              <a href="#seguranca">Segurança</a>
              <a href="#duvidas">Dúvidas frequentes</a>
              <a
                href="/privacidade"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenLegalPage) {
                    onOpenLegalPage('privacidade');
                  } else {
                    window.location.href = '/privacidade';
                  }
                }}
              >
                Privacidade (LGPD)
              </a>
              <a
                href="/exclusao-de-dados"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenLegalPage) {
                    onOpenLegalPage('exclusao');
                  } else {
                    window.location.href = '/exclusao-de-dados';
                  }
                }}
              >
                Exclusão de Dados
              </a>
              <a
                href="/termos"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenLegalPage) {
                    onOpenLegalPage('termos');
                  } else {
                    window.location.href = '/termos';
                  }
                }}
              >
                Termos de Uso
              </a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>
              © <span>{currentYear}</span> BeyondTime. Feito para novas
              histórias.
            </span>
            <span className="footer-location">
              Feito com cuidado em Sergipe, Brasil{' '}
              <span aria-hidden="true">✳</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
