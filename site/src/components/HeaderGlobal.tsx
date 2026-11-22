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
          <p className="site-header__tagline">Um novo tempo para se conectar.</p>

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
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-15.66 4.93 1.41-1.41m11.32-11.32 1.41-1.41" />
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
