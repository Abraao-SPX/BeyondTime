import type { MouseEvent } from 'react';
import type { AuthViewId } from '../types/auth';

interface HeaderGlobalProps {
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onBackToLanding?: () => void;
  onToggleAccessibility?: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export function HeaderGlobal({
  onNavigate,
  onBackToLanding,
  onToggleAccessibility,
  highContrast = false,
  onToggleHighContrast,
}: HeaderGlobalProps) {
  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (onBackToLanding) {
      onBackToLanding();
      return;
    }
    onNavigate('login', event.currentTarget);
  }

  function handleBackClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (onBackToLanding) {
      onBackToLanding();
      return;
    }
    onNavigate('login', event.currentTarget);
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a
          className="brand"
          href="#inicio"
          onClick={handleBrandClick}
          aria-label="BeyondTime, voltar para a página inicial"
        >
          <img
            className="brand__logo-img"
            src={highContrast ? '/assets/beyondtime-brand-dark.png' : '/assets/beyondtime-brand-light.png'}
            alt="BeyondTime"
          />
        </a>

        <div className="site-header__right">
          {onToggleAccessibility && (
            <button
              type="button"
              className="btn-theme-toggle"
              aria-label="Abrir preferências de acessibilidade 50+"
              title="Acessibilidade 50+"
              onClick={onToggleAccessibility}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="home-icon"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}

          {onToggleHighContrast && (
            <button
              type="button"
              className="btn-theme-toggle"
              aria-pressed={highContrast}
              aria-label={highContrast ? 'Ativar modo claro' : 'Ativar modo noturno'}
              title={highContrast ? 'Modo claro' : 'Modo noturno'}
              onClick={onToggleHighContrast}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="home-icon"
                aria-hidden="true"
              >
                {highContrast ? (
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
                ) : (
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                )}
              </svg>
            </button>
          )}

          <button
            type="button"
            className="site-header__home-btn"
            onClick={handleBackClick}
          >
            Voltar
          </button>
        </div>
      </div>
    </header>
  );
}
