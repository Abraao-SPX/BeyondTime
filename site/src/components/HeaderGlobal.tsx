import type { MouseEvent } from 'react';
import beyondLogo from '../../assets/beyondlogoicon.svg';
import type { AuthViewId } from '../types/auth';

interface HeaderGlobalProps {
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onBackToLanding?: () => void;
}

export function HeaderGlobal({ onNavigate, onBackToLanding }: HeaderGlobalProps) {
  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
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
            className="brand__logo"
            src={beyondLogo}
            width={42}
            height={26}
            alt=""
          />
          <span className="brand__name">BeyondTime</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <p className="site-header__tagline">Um novo tempo para se conectar.</p>
          {onBackToLanding && (
            <button
              type="button"
              className="btn--back"
              style={{ marginBottom: 0, padding: '8px 14px', fontSize: '15px' }}
              onClick={onBackToLanding}
            >
              ← Página inicial
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
