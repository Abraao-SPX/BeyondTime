import type { MouseEvent } from 'react';
import beyondLogo from '../../assets/beyondlogoicon.svg';
import type { AuthViewId } from '../types/auth';

interface HeaderGlobalProps {
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

export function HeaderGlobal({ onNavigate }: HeaderGlobalProps) {
  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate('login', event.currentTarget);
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a
          className="brand"
          href="#view-login"
          onClick={handleBrandClick}
          aria-label="BeyondTime, voltar para a tela de entrada"
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
        <p className="site-header__tagline">Um novo tempo para se conectar.</p>
      </div>
    </header>
  );
}
