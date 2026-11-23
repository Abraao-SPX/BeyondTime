import { useEffect, useState } from 'react';

const FONT_SCALE_STORAGE_KEY = 'beyondtime_accessibility_font_scale_v1';

export const FONT_SCALE_STEPS = [100, 115, 130, 145, 160] as const;
export type FontScaleStep = typeof FONT_SCALE_STEPS[number];

export function applyFontScale(fontScale: FontScaleStep): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = `${fontScale}%`;
}

export function loadStoredFontScale(): FontScaleStep {
  if (typeof window === 'undefined') return 100;
  try {
    const rawScale = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const parsedScale = rawScale ? Number(rawScale) : 100;
    return (FONT_SCALE_STEPS as readonly number[]).includes(parsedScale)
      ? (parsedScale as FontScaleStep)
      : 100;
  } catch {
    return 100;
  }
}

export function saveStoredFontScale(scale: FontScaleStep): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // Falha silenciosa em caso de restrições de storage
  }
}

interface AccessibilityPanelRF09Props {
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen?: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export function AccessibilityPanelRF09({
  isOpen,
  onClose,
  highContrast = false,
  onToggleHighContrast,
}: AccessibilityPanelRF09Props) {
  const [fontScale, setFontScale] = useState<FontScaleStep>(() => {
    const initial = loadStoredFontScale();
    applyFontScale(initial);
    return initial;
  });

  useEffect(() => {
    applyFontScale(fontScale);
    saveStoredFontScale(fontScale);
  }, [fontScale]);

  function handleScaleChange(newScale: FontScaleStep) {
    setFontScale(newScale);
  }

  function handleStepDown() {
    setFontScale((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const nextIdx = Math.max(0, idx - 1);
      return FONT_SCALE_STEPS[nextIdx];
    });
  }

  function handleStepUp() {
    setFontScale((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const nextIdx = Math.min(FONT_SCALE_STEPS.length - 1, idx + 1);
      return FONT_SCALE_STEPS[nextIdx];
    });
  }

  function handleResetAll() {
    setFontScale(100);
    if (highContrast && onToggleHighContrast) {
      onToggleHighContrast();
    }
  }

  return (
    <>
      {/* Modal Defensivo de Acessibilidade (acionado pelo botão de olho no cabeçalho) */}
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
                  Acessibilidade
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
                Tamanho da Fonte: <span style={{ color: 'var(--brand-primary)' }}>{fontScale}%</span>
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Aumente o texto para maior conforto visual (vista cansada ou catarata).
              </p>

              <div className="accessibility-stepper-row" style={{ marginBottom: '12px' }}>
                <button
                  type="button"
                  className="accessibility-stepper-btn"
                  onClick={handleStepDown}
                  disabled={fontScale <= 100}
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
                  disabled={fontScale >= 160}
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
                      fontScale === stepVal ? 'accessibility-stepper-btn--active' : ''
                    }`}
                    onClick={() => handleScaleChange(stepVal)}
                    aria-pressed={fontScale === stepVal}
                    aria-label={`Definir escala de fonte em ${stepVal}%`}
                  >
                    {stepVal}%
                  </button>
                ))}
              </div>
            </section>

            {/* Modo de Alto Contraste e Escuro (WCAG AAA) */}
            <section className="accessibility-section" aria-labelledby="contrast-heading">
              <h3 id="contrast-heading" className="accessibility-section-title">
                Contraste e Leitura
              </h3>
              <button
                type="button"
                className={`accessibility-toggle-btn ${
                  highContrast ? 'accessibility-toggle-btn--active' : ''
                }`}
                onClick={onToggleHighContrast}
                aria-pressed={highContrast}
                aria-label="Alternar Modo Noturno e Alto Contraste padrão WCAG AAA"
              >
                <span>
                  <strong>Modo Noturno e Alto Contraste (WCAG AAA)</strong>
                  <br />
                  <small style={{ color: 'var(--text-muted)' }}>
                    Fundo escuro com alto contraste, reduzindo o cansaço dos olhos
                  </small>
                </span>
                <span
                  className={`accessibility-badge ${
                    highContrast ? 'accessibility-badge--on' : 'accessibility-badge--off'
                  }`}
                >
                  {highContrast ? 'ATIVADO' : 'DESATIVADO'}
                </span>
              </button>
            </section>

            {/* Dica defensiva */}
            <div className="callout-amber" style={{ fontSize: '13px', marginTop: '16px' }}>
              ℹ️ <strong>Dica de Uso:</strong> Suas preferências ficam salvas automaticamente no seu navegador neste dispositivo.
            </div>

            <footer className="accessibility-modal-footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleResetAll}
                aria-label="Restaurar preferências padrões de acessibilidade"
              >
                Restaurar Padrões
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={onClose}
                aria-label="Concluir e fechar painel"
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
