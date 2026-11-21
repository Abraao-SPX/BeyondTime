import { useEffect, useState } from 'react';

const FONT_SCALE_STORAGE_KEY = 'beyondtime_accessibility_font_scale_v1';
const HIGH_CONTRAST_STORAGE_KEY = 'beyondtime_accessibility_high_contrast_v1';
const DARK_MODE_STORAGE_KEY = 'beyondtime_accessibility_dark_mode_v1';

export const FONT_SCALE_STEPS = [100, 115, 130, 145, 160] as const;
export type FontScaleStep = typeof FONT_SCALE_STEPS[number];

export interface AccessibilityState {
  fontScale: FontScaleStep;
  highContrast: boolean;
  darkMode: boolean;
}

export function applyAccessibilityState(state: AccessibilityState): void {
  if (typeof document === 'undefined') return;

  // Aplicação instantânea sem reload (RF-09)
  document.documentElement.style.fontSize = `${state.fontScale}%`;

  if (state.highContrast) {
    document.documentElement.classList.add('high-contrast-mode');
  } else {
    document.documentElement.classList.remove('high-contrast-mode');
  }

  if (state.darkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

export function loadStoredAccessibilityState(): AccessibilityState {
  if (typeof window === 'undefined') {
    return { fontScale: 100, highContrast: false, darkMode: false };
  }

  try {
    const rawScale = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const parsedScale = rawScale ? Number(rawScale) : 100;
    const fontScale: FontScaleStep = (FONT_SCALE_STEPS as readonly number[]).includes(parsedScale)
      ? (parsedScale as FontScaleStep)
      : 100;

    const highContrast = window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
    const darkMode = window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';

    return { fontScale, highContrast, darkMode };
  } catch {
    return { fontScale: 100, highContrast: false, darkMode: false };
  }
}

export function saveStoredAccessibilityState(state: AccessibilityState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(state.fontScale));
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(state.highContrast));
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, String(state.darkMode));
  } catch {
    // Falha silenciosa em caso de restrições de storage
  }
}

interface AccessibilityPanelRF09Props {
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen?: () => void;
}

export function AccessibilityPanelRF09({
  isOpen,
  onClose,
  onToggleOpen,
}: AccessibilityPanelRF09Props) {
  const [state, setState] = useState<AccessibilityState>(() => {
    const initial = loadStoredAccessibilityState();
    applyAccessibilityState(initial);
    return initial;
  });

  // Garante hidratação e sincronização inicial
  useEffect(() => {
    applyAccessibilityState(state);
    saveStoredAccessibilityState(state);
  }, [state]);

  function handleScaleChange(newScale: FontScaleStep) {
    setState((prev) => ({ ...prev, fontScale: newScale }));
  }

  function handleStepDown() {
    setState((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev.fontScale);
      const nextIdx = Math.max(0, idx - 1);
      return { ...prev, fontScale: FONT_SCALE_STEPS[nextIdx] };
    });
  }

  function handleStepUp() {
    setState((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev.fontScale);
      const nextIdx = Math.min(FONT_SCALE_STEPS.length - 1, idx + 1);
      return { ...prev, fontScale: FONT_SCALE_STEPS[nextIdx] };
    });
  }

  function handleToggleHighContrast() {
    setState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }

  function handleToggleDarkMode() {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }

  function handleResetAll() {
    const resetState: AccessibilityState = {
      fontScale: 100,
      highContrast: false,
      darkMode: false,
    };
    setState(resetState);
  }

  return (
    <>
      {/* Botão flutuante persistente 50+ com área mínima de toque de 48px (RF-06 / RF-09) */}
      {onToggleOpen && (
        <button
          type="button"
          className="accessibility-floating-btn"
          onClick={onToggleOpen}
          aria-label="Painel de Acessibilidade 50+: ajuste tamanho do texto, alto contraste e modo noturno"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span aria-hidden="true" style={{ fontSize: '20px' }}>👁️</span>
          <span>Acessibilidade 50+</span>
        </button>
      )}

      {/* Modal Defensivo de Acessibilidade */}
      {isOpen && (
        <div
          className="accessibility-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-panel-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <div className="accessibility-modal-card">
            <header className="accessibility-modal-header">
              <div>
                <p className="defensive-modal__badge" style={{ marginBottom: '6px' }}>
                  Acessibilidade Dinâmica (RF-09)
                </p>
                <h2 id="accessibility-panel-title" className="accessibility-modal-title">
                  Preferências de Visualização 50+
                </h2>
              </div>
              <button
                type="button"
                className="accessibility-btn-close"
                onClick={onClose}
                aria-label="Fechar painel de acessibilidade"
              >
                ✕ Fechar
              </button>
            </header>

            {/* Ajuste Escalar de Fonte: 100% até 160% */}
            <section className="accessibility-section" aria-labelledby="font-scale-heading">
              <h3 id="font-scale-heading" className="accessibility-section-title">
                Tamanho da Fonte: <span style={{ color: 'var(--brand-primary)' }}>{state.fontScale}%</span>
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Aumente o texto para maior conforto visual (vista cansada ou catarata).
              </p>

              <div className="accessibility-stepper-row" style={{ marginBottom: '12px' }}>
                <button
                  type="button"
                  className="accessibility-stepper-btn"
                  onClick={handleStepDown}
                  disabled={state.fontScale <= 100}
                  aria-label="Diminuir tamanho da fonte"
                >
                  A- Diminuir
                </button>
                <button
                  type="button"
                  className="accessibility-stepper-btn"
                  onClick={() => handleScaleChange(100)}
                  aria-label="Restaurar tamanho padrão da fonte em 100%"
                >
                  100% (Padrão)
                </button>
                <button
                  type="button"
                  className="accessibility-stepper-btn"
                  onClick={handleStepUp}
                  disabled={state.fontScale >= 160}
                  aria-label="Aumentar tamanho da fonte"
                >
                  A+ Aumentar
                </button>
              </div>

              <div className="accessibility-stepper-row" role="group" aria-label="Escalas rápidas de fonte">
                {FONT_SCALE_STEPS.map((stepVal) => (
                  <button
                    key={stepVal}
                    type="button"
                    className={`accessibility-stepper-btn ${
                      state.fontScale === stepVal ? 'accessibility-stepper-btn--active' : ''
                    }`}
                    onClick={() => handleScaleChange(stepVal)}
                    aria-pressed={state.fontScale === stepVal}
                    aria-label={`Definir escala de fonte em ${stepVal}%`}
                  >
                    {stepVal}%
                  </button>
                ))}
              </div>
            </section>

            {/* Modo de Alto Contraste (WCAG AAA) */}
            <section className="accessibility-section" aria-labelledby="contrast-heading">
              <h3 id="contrast-heading" className="accessibility-section-title">
                Contraste e Leitura
              </h3>
              <button
                type="button"
                className={`accessibility-toggle-btn ${
                  state.highContrast ? 'accessibility-toggle-btn--active' : ''
                }`}
                onClick={handleToggleHighContrast}
                aria-pressed={state.highContrast}
                aria-label="Alternar Modo de Alto Contraste padrão WCAG AAA"
              >
                <span>
                  <strong>Modo de Alto Contraste (WCAG AAA)</strong>
                  <br />
                  <small style={{ color: 'var(--text-muted)' }}>
                    Fundo preto com textos em amarelo/branco e bordas grossas
                  </small>
                </span>
                <span
                  className={`accessibility-badge ${
                    state.highContrast ? 'accessibility-badge--on' : 'accessibility-badge--off'
                  }`}
                >
                  {state.highContrast ? 'ATIVADO' : 'DESATIVADO'}
                </span>
              </button>

              {/* Modo Noturno */}
              <button
                type="button"
                className={`accessibility-toggle-btn ${
                  state.darkMode ? 'accessibility-toggle-btn--active' : ''
                }`}
                onClick={handleToggleDarkMode}
                aria-pressed={state.darkMode}
                aria-label="Alternar Modo Noturno escuro"
              >
                <span>
                  <strong>Modo Noturno (Escuro)</strong>
                  <br />
                  <small style={{ color: 'var(--text-muted)' }}>
                    Tema escuro suave para leitura confortável à noite
                  </small>
                </span>
                <span
                  className={`accessibility-badge ${
                    state.darkMode ? 'accessibility-badge--on' : 'accessibility-badge--off'
                  }`}
                >
                  {state.darkMode ? 'ATIVADO' : 'DESATIVADO'}
                </span>
              </button>
            </section>

            <footer style={{ marginTop: '20px', borderTop: '1px solid var(--border-card)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ minHeight: '48px', minWidth: '48px', padding: '10px 16px', fontSize: '15px' }}
                onClick={handleResetAll}
                aria-label="Redefinir todas as configurações visuais para o padrão"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ minHeight: '48px', minWidth: '48px', padding: '10px 24px', fontSize: '15px' }}
                onClick={onClose}
                aria-label="Concluir e fechar painel de acessibilidade"
              >
                Concluir
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
