import type { MouseEvent } from 'react';
import type { LegalPageId } from '../types/auth';

interface FooterGlobalProps {
  onOpenLegalPage?: (page: LegalPageId) => void;
}

export function FooterGlobal({ onOpenLegalPage }: FooterGlobalProps) {
  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>, page: LegalPageId) {
    event.preventDefault();
    if (onOpenLegalPage) {
      onOpenLegalPage(page);
    } else {
      window.location.href =
        page === 'privacidade'
          ? '/privacidade'
          : page === 'exclusao'
          ? '/exclusao-de-dados'
          : '/termos';
    }
  }

  return (
    <footer className="site-footer">
      <p className="site-footer__tagline">Conexões reais. No seu tempo.</p>
      <nav className="site-footer__legal" aria-label="Informações legais">
        <a
          href="/privacidade"
          className="site-footer__link"
          onClick={(e) => handleLinkClick(e, 'privacidade')}
        >
          Política de Privacidade (LGPD)
        </a>
        <a
          href="/exclusao-de-dados"
          className="site-footer__link"
          onClick={(e) => handleLinkClick(e, 'exclusao')}
        >
          Exclusão de Dados
        </a>
        <a
          href="/termos"
          className="site-footer__link"
          onClick={(e) => handleLinkClick(e, 'termos')}
        >
          Termos de Uso 50+
        </a>
      </nav>
    </footer>
  );
}
