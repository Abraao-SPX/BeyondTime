import type { MouseEvent } from 'react';
import beyondLogo from '../../assets/beyondlogoicon.svg';
import type { LegalPageId } from '../types/auth';

interface PaginasLegaisProps {
  activeTab: LegalPageId;
  onSelectTab: (tab: LegalPageId) => void;
  onBackToHome: () => void;
}

export function PaginasLegais({
  activeTab,
  onSelectTab,
  onBackToHome,
}: PaginasLegaisProps) {
  function handleTabClick(event: MouseEvent<HTMLAnchorElement>, tab: LegalPageId) {
    event.preventDefault();
    onSelectTab(tab);
  }

  return (
    <div className="legal-page-shell">
      <a className="skip-link" href="#conteudo-legal">
        Pular para o conteúdo legal
      </a>

      {/* Cabeçalho acessível com botão Voltar explícito 50+ */}
      <header className="legal-header" role="banner">
        <div className="legal-header__inner">
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackToHome();
            }}
            aria-label="BeyondTime — Voltar para a página inicial"
          >
            <img
              className="brand__logo"
              src={beyondLogo}
              width={42}
              height={26}
              alt=""
            />
            <span className="brand__name">BeyondTime</span>
          </a>

          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: 'auto', minHeight: 'var(--touch-min)', padding: '8px 18px' }}
            onClick={onBackToHome}
            aria-label="Voltar para a página inicial do BeyondTime"
          >
            ← Voltar para a página inicial
          </button>
        </div>
      </header>

      <main className="legal-main" id="conteudo-legal" role="main">
        <div className="legal-card">
          {/* Navegação entre abas de documentos legais com acessibilidade WCAG AAA */}
          <nav
            className="legal-tabs"
            role="tablist"
            aria-label="Navegação entre documentos legais e conformidade"
          >
            <a
              href="/privacidade"
              role="tab"
              id="tab-privacidade"
              aria-controls="panel-privacidade"
              aria-selected={activeTab === 'privacidade'}
              aria-current={activeTab === 'privacidade' ? 'page' : undefined}
              className={`legal-tab ${activeTab === 'privacidade' ? 'legal-tab--active' : ''}`}
              onClick={(e) => handleTabClick(e, 'privacidade')}
            >
              🔒 Política de Privacidade (LGPD)
            </a>
            <a
              href="/exclusao-de-dados"
              role="tab"
              id="tab-exclusao"
              aria-controls="panel-exclusao"
              aria-selected={activeTab === 'exclusao'}
              aria-current={activeTab === 'exclusao' ? 'page' : undefined}
              className={`legal-tab ${activeTab === 'exclusao' ? 'legal-tab--active' : ''}`}
              onClick={(e) => handleTabClick(e, 'exclusao')}
            >
              🗑️ Exclusão de Dados (Meta / LGPD)
            </a>
            <a
              href="/termos"
              role="tab"
              id="tab-termos"
              aria-controls="panel-termos"
              aria-selected={activeTab === 'termos'}
              aria-current={activeTab === 'termos' ? 'page' : undefined}
              className={`legal-tab ${activeTab === 'termos' ? 'legal-tab--active' : ''}`}
              onClick={(e) => handleTabClick(e, 'termos')}
            >
              📜 Termos de Uso 50+
            </a>
          </nav>

          {/* =========================================================
              ABA 1: POLÍTICA DE PRIVACIDADE E SEGURANÇA (LGPD / OAUTH)
              ========================================================= */}
          {activeTab === 'privacidade' && (
            <article
              id="panel-privacidade"
              role="tabpanel"
              aria-labelledby="tab-privacidade"
              className="legal-article"
            >
              <span className="legal-badge">Conformidade LGPD & Meta OAuth 2.0</span>
              <h1 className="legal-title">
                Política de Privacidade e Proteção de Dados
              </h1>
              <p className="legal-subtitle">
                Última atualização: 18 de novembro de 2026 • Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)
              </p>

              <div className="legal-callout">
                <strong>Nosso compromisso com a pessoa 50+:</strong> O BeyondTime foi concebido para proporcionar segurança, tranquilidade e transparência absoluta. Tratamos apenas as informações estritamente necessárias para promover encontros e amizades reais com respeito à sua dignidade e autonomia.
              </div>

              <h2>1. Identificação do Controlador e Âmbito de Atuação</h2>
              <p>
                O <strong>BeyondTime (Silver Economy 50+)</strong> é uma plataforma digital desenvolvida para fomentar conexões autênticas, novas amizades e companhias para pessoas com 50 anos ou mais. A atuação inicial e pilotos regionais concentram-se no estado de <strong>Sergipe</strong>, abrangendo a Região Metropolitana de Aracaju (Aracaju, Nossa Senhora do Socorro, São Cristóvão, Barra dos Coqueiros) e municípios do interior (Lagarto, Itabaiana, Estância e demais regiões sergipanas).
              </p>

              <h2>2. Dados Pessoais Coletados e Suas Finalidades</h2>
              <p>
                Em observância ao princípio da necessidade da LGPD (Art. 6º, III), coletamos exclusivamente os seguintes dados:
              </p>
              <ul>
                <li>
                  <strong>Autenticação Segura (RF01):</strong> E-mail de cadastro acompanhado de senha protegida por função criptográfica de mão única (hash irreversível <code>BCrypt</code> com salt forte), ou credencial pública federada via <strong>OAuth 2.0</strong> (Google Identity e <strong>Facebook Login / Meta App ID <code>29391801830505054</code></strong> integrado ao Firebase Authentication). O BeyondTime <em>nunca</em> tem acesso à sua senha da Meta ou do Google.
                </li>
                <li>
                  <strong>Elegibilidade Etária e Perfil 50+ (RF02):</strong> Nome completo, primeiro nome de exibição pública e data de nascimento. O sistema realiza cálculo algorítmico rigoroso exigindo idade mínima de 50 anos completos, com bloqueio automático de cadastro para menores de 50 anos, preservando a identidade exclusiva da comunidade.
                </li>
                <li>
                  <strong>Localização Geográfica em Sergipe (RF02 e RF05):</strong> Cidade de residência no estado de Sergipe, utilizada exclusivamente para cálculo de proximidade e sugestão de encontros presenciais seguros.
                </li>
                <li>
                  <strong>Foto de Perfil:</strong> Fotografia inserida voluntariamente pelo usuário para identificação e interação visual com outros participantes da rede.
                </li>
                <li>
                  <strong>Taxonomia de Hobbies e Afinidades (RF03):</strong> Seleção guiada de no mínimo 3 e no máximo 10 interesses do catálogo temático oficial (ex.: jardinagem, culinária, artesanato, caminhadas, música, literatura, jogos de salão), utilizada no cálculo de similaridade e compatibilidade entre usuários.
                </li>
                <li>
                  <strong>Biometria Facial e Prova de Vida Opcional (RF11):</strong> Procedimento voluntário de verificação facial com detecção de vivacidade (<em>liveness detection</em>) para concessão do <strong>Selo de Verificado 50+</strong>. Os dados de análise facial não são comercializados nem compartilhados com terceiros e destinam-se exclusivamente à validação anti-golpe e prevenção de falsidade ideológica.
                </li>
              </ul>

              <h2>3. Sanitização e Blindagem de Dados na Inteligência Artificial (RF10)</h2>
              <p>
                O BeyondTime disponibiliza o assistente quebra-gelo inteligente <strong>BeyondAssistant</strong> para auxiliar no início de conversas e sugerir assuntos em comum:
              </p>
              <ul>
                <li>
                  <strong>Sanitização Prévia Rigorosa:</strong> Nenhum dado sensível ou identificador pessoal direto — tais como CPF, sobrenome, endereço exato, e-mail, telefone residencial ou fotos — é jamais encaminhado para modelos externos de linguagem (LLMs).
                </li>
                <li>
                  <strong>Contexto Estritamente Temático:</strong> Apenas o primeiro nome, os hobbies em comum cadastrados e o contexto cultural sergipano são processados para gerar sugestões acolhedoras de diálogo.
                </li>
                <li>
                  <strong>Fallback Local de Alta Disponibilidade:</strong> Em situações de indisponibilidade da rede ou LLM externa, um motor de regras local gera quebra-gelos pré-aprovados em menos de 50 milissegundos sem qualquer tráfego externo.
                </li>
              </ul>

              <h2>4. Seus Direitos Fundamentais como Titular de Dados (LGPD Art. 18)</h2>
              <p>
                O BeyondTime garante a você o exercício pleno e facilitado de todos os direitos previstos na LGPD:
              </p>
              <ul>
                <li>
                  <strong>Confirmação e Acesso aos Dados:</strong> Você pode visualizar todos os seus dados cadastrais a qualquer momento no perfil da sua conta.
                </li>
                <li>
                  <strong>Portabilidade e Exportação Completa em JSON (RF13):</strong> Acesso ao <em>Portal de Privacidade LGPD</em> para realizar o download integral e legível de todos os seus dados pessoais, histórico de interações e preferências em formato <code>JSON</code> estruturado.
                </li>
                <li>
                  <strong>Eliminação Definitiva dos Dados (RF14):</strong> Direito de solicitar a exclusão irrevogável de todos os seus dados pessoais e encerramento de conta a qualquer instante, concluída em até <strong>48 horas</strong>.
                </li>
              </ul>

              <h2>5. Canal de Atendimento do Encarregado de Proteção de Dados (DPO)</h2>
              <p>
                Para exercer seus direitos de titular, tirar dúvidas sobre esta Política ou relatar incidentes de segurança, entre em contato direto com nosso Encarregado pelo e-mail:
              </p>
              <div className="legal-callout">
                📧 <strong>Encarregado pelo Tratamento de Dados (DPO):</strong>{' '}
                <a
                  href="mailto:privacidade@bytime.me"
                  style={{ color: 'var(--brand-primary)', fontWeight: 700 }}
                >
                  privacidade@bytime.me
                </a>
                <br />
                Resposta no prazo máximo de 48 horas úteis.
              </div>
            </article>
          )}

          {/* =========================================================
              ABA 2: INSTRUÇÕES DE EXCLUSÃO DE DADOS (META / LGPD / RF14)
              ========================================================= */}
          {activeTab === 'exclusao' && (
            <article
              id="panel-exclusao"
              role="tabpanel"
              aria-labelledby="tab-exclusao"
              className="legal-article"
            >
              <span className="legal-badge">Conformidade Meta for Developers & LGPD Art. 18</span>
              <h1 className="legal-title">
                Instruções de Exclusão de Conta e Dados do Usuário
              </h1>
              <p className="legal-subtitle">
                Procedimento oficial para remoção definitiva de informações de login social (Facebook / Google) e dados cadastrais no BeyondTime.
              </p>

              <div className="legal-callout">
                <strong>Garantia de Exclusão Definitiva (RF14):</strong> Você tem total autonomia para apagar sua conta, seus dados pessoais, fotos e conversas a qualquer momento. Nenhum dado de conta excluída é comercializado ou retido após o prazo legal de descarte.
              </div>

              <p>
                Se você utiliza o <strong>BeyondTime</strong> e deseja excluir sua conta e todas as informações associadas recebidas via <strong>Facebook Login (Meta App ID <code>29391801830505054</code>)</strong> ou Google OAuth, disponibilizamos <strong>três opções diretas e acessíveis</strong>:
              </p>

              <h2>Opção 1 — Exclusão Direta Dentro do BeyondTime (Fluxo Oficial do App — RF14)</h2>
              <div className="legal-step-card">
                <div className="legal-step-card__header">
                  <span className="legal-step-card__number">1</span>
                  <h3 className="legal-step-card__title">Acesse o sistema</h3>
                </div>
                <p>
                  Acesse sua conta no BeyondTime pelo site oficial{' '}
                  <a href="https://bytime.me" target="_blank" rel="noopener noreferrer">
                    https://bytime.me
                  </a>{' '}
                  utilizando suas credenciais ou o botão de login social com o Facebook.
                </p>
              </div>

              <div className="legal-step-card">
                <div className="legal-step-card__header">
                  <span className="legal-step-card__number">2</span>
                  <h3 className="legal-step-card__title">Abra o Portal de Privacidade LGPD</h3>
                </div>
                <p>
                  No menu do usuário, selecione <strong>"Configurações da Conta"</strong> e clique em <strong>"Portal de Privacidade LGPD"</strong>.
                </p>
              </div>

              <div className="legal-step-card">
                <div className="legal-step-card__header">
                  <span className="legal-step-card__number">3</span>
                  <h3 className="legal-step-card__title">Acione a Exclusão Definitiva</h3>
                </div>
                <p>
                  Localize a opção <em>"Excluir minha conta e meus dados definitivamente"</em> destacada em vermelho.
                </p>
              </div>

              <div className="legal-step-card">
                <div className="legal-step-card__header">
                  <span className="legal-step-card__number">4</span>
                  <h3 className="legal-step-card__title">Confirmação Dupla Defensiva de 5 Segundos</h3>
                </div>
                <p>
                  Para proteger o público 50+ contra toques acidentais, o sistema exibirá uma janela de <strong>Confirmação Dupla Defensiva</strong> com temporizador de segurança de <strong>5 segundos</strong>. O botão de confirmação permanecerá temporariamente bloqueado até que a contagem regressiva termine.
                </p>
              </div>

              <div className="legal-step-card">
                <div className="legal-step-card__header">
                  <span className="legal-step-card__number">5</span>
                  <h3 className="legal-step-card__title">Remoção em até 48 Horas</h3>
                </div>
                <p>
                  Após confirmar, sua sessão será encerrada de imediato e todos os seus dados (perfil, biometria, fotos, matches e logs de login social) serão expurgados de forma lógica e física do banco de dados no prazo limite de <strong>48 horas</strong>, conforme estabelecido no Requisito <strong>RF14</strong>.
                </p>
              </div>

              <h2>Opção 2 — Revogação de Acesso no Facebook (Instrução Oficial Meta)</h2>
              <p>
                Caso você queira revogar a conexão e solicitar a exclusão de dados diretamente pelo painel de controle do Facebook:
              </p>
              <ol>
                <li>Faça login na sua conta do Facebook pelo navegador ou aplicativo para smartphone.</li>
                <li>Clique na sua foto de perfil no canto superior direito e acesse <strong>Configurações e privacidade &gt; Configurações</strong>.</li>
                <li>Na barra lateral esquerda, clique em <strong>Aplicativos e sites</strong>.</li>
                <li>Localize o aplicativo <strong>BeyondTime</strong> na listagem de aplicativos ativos.</li>
                <li>Clique no botão <strong>Remover</strong> ao lado do nome do aplicativo.</li>
                <li>
                  Na janela pop-up que se abrirá, você poderá marcar a opção para excluir publicações, vídeos ou eventos que o aplicativo possa ter publicado em seu nome e confirmar a remoção.
                </li>
                <li>
                  Para solicitar que o BeyondTime apague os dados concedidos pelo Facebook, acesse a aba <em>Removidos</em>, clique em <em>BeyondTime</em> e clique em <strong>Enviar solicitação</strong>. Uma confirmação de solicitação com código de acompanhamento será gerada pela Meta.
                </li>
              </ol>

              <h2>Opção 3 — Solicitação Direta por E-mail ao DPO</h2>
              <p>
                Se você não tiver mais acesso ao aplicativo ou desejar formalizar a solicitação diretamente com a nossa equipe jurídica e de conformidade:
              </p>
              <div className="legal-callout">
                📧 Envie um e-mail para: <strong>privacidade@bytime.me</strong>
                <br />
                <strong>Assunto:</strong> <em>Exclusão de Dados LGPD</em>
                <br />
                <strong>Corpo do e-mail:</strong> Informe seu nome completo e o endereço de e-mail associado à conta do BeyondTime (ou ID de usuário do Facebook).
                <br />
                <strong>Prazo de execução:</strong> A exclusão definitiva será concluída e confirmada por e-mail no prazo máximo de <strong>48 horas</strong>.
              </div>
            </article>
          )}

          {/* =========================================================
              ABA 3: TERMOS DE USO E CÓDIGO DE CONDUTA 50+
              ========================================================= */}
          {activeTab === 'termos' && (
            <article
              id="panel-termos"
              role="tabpanel"
              aria-labelledby="tab-termos"
              className="legal-article"
            >
              <span className="legal-badge">Elegibilidade Exclusiva 50+ & Segurança Comunitária</span>
              <h1 className="legal-title">
                Termos de Uso e Código de Convivência 50+
              </h1>
              <p className="legal-subtitle">
                Regras claras para uma convivência respeitosa, segura e acolhedora na comunidade BeyondTime.
              </p>

              <div className="legal-callout">
                <strong>Princípio Central:</strong> O BeyondTime existe para que pessoas maduras celebrem a vida, descubram novas amizades e construam boas memórias no seu próprio tempo, livres de pressões, desrespeito ou insegurança.
              </div>

              <h2>1. Elegibilidade Exclusiva 50+ (RF02)</h2>
              <p>
                O ingresso e uso do BeyondTime é restrito exclusivamente a pessoas com <strong>50 anos ou mais</strong> na data de criação da conta. Nossa plataforma realiza validação matemática no ato do cadastro e se reserva o direito de desativar prontamente cadastros que não cumpram esse requisito essencial de público-alvo.
              </p>

              <h2>2. Tolerância Zero contra Golpes Financeiros e Fraudes</h2>
              <p>
                Para preservar a integridade patrimonial e emocional de nossa comunidade:
              </p>
              <ul>
                <li>
                  <strong>Proibição Absoluta de Solicitação de Valores:</strong> É expressamente proibido solicitar transferências bancárias, PIX, dinheiro em espécie, empréstimos, doações, depósitos ou compra de cartões-presente (<em>gift cards</em>) para qualquer outro usuário.
                </li>
                <li>
                  <strong>Banimento Imediato:</strong> Perfis flagrados violando essa diretriz serão sumariamente expulsos da plataforma sem aviso prévio.
                </li>
                <li>
                  <strong>Encaminhamento Jurídico:</strong> Em caso de tentativa de estelionato ou fraude contra pessoa idosa (Art. 171 do Código Penal c/c Estatuto da Pessoa Idosa), os registros de conexão e metadados serão encaminhados às autoridades policiais competentes de Sergipe.
                </li>
              </ul>

              <h2>3. Canal de Denúncia Rápida e Congelamento Cautelar (RF12)</h2>
              <p>
                A segurança da nossa comunidade é construída coletivamente:
              </p>
              <ul>
                <li>
                  Todo perfil e janela de conversa possui um botão visível de <strong>"Denunciar"</strong>.
                </li>
                <li>
                  Ao registrar uma denúncia fundamentada de assédio, agressividade verbal, golpe ou falsidade de identidade, o sistema aplica um <strong>Congelamento Cautelar Imediato</strong> na conta investigada.
                </li>
                <li>
                  Durante o congelamento, o usuário denunciado não pode interagir nem visualizar perfis até a conclusão da análise por moderadores humanos.
                </li>
              </ul>

              <h2>4. Orientações Defensivas para Encontros Presenciais</h2>
              <p>
                Ao decidir encontrar pessoalmente alguém conhecido através do BeyondTime, siga sempre as recomendações de segurança:
              </p>
              <ol>
                <li>Marque os primeiros encontros sempre durante o dia e em locais públicos com grande circulação de pessoas (cafeterias, shoppings, orlas ou parques movimentados em Aracaju e região).</li>
                <li>Vá e volte utilizando seu próprio meio de transporte ou aplicativo de mobilidade urbana de sua confiança.</li>
                <li>Avise sempre a um familiar ou amigo próximo onde você estará e com quem irá se encontrar.</li>
                <li>Nunca forneça informações confidenciais, números de cartão de crédito, senhas bancárias ou cópias de documentos pessoais.</li>
              </ol>

              <h2>5. Foro e Legislação Aplicável</h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código Civil Brasileiro, o Marco Civil da Internet e o Estatuto da Pessoa Idosa (Lei nº 10.741/2003). Fica eleito o Foro da Comarca de <strong>Aracaju, Estado de Sergipe</strong>, para dirimir eventuais controvérsias decorrentes destes Termos.
              </p>
            </article>
          )}

          {/* Rodapé acessível do documento legal com botão voltar explícito */}
          <div className="legal-footer-nav legal-actions">
            <button
              type="button"
              className="btn btn--primary btn--back-cta"
              onClick={onBackToHome}
              aria-label="Voltar para a página inicial do BeyondTime"
            >
              ← Voltar para a página inicial
            </button>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              BeyondTime • Boas histórias não têm idade.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
