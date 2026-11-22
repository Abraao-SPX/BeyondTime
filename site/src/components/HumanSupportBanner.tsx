import { useState } from 'react';

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || 'suporte.beyondtime@gmail.com';

export function HumanSupportBanner() {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <aside className="support-banner" aria-label="Central de suporte oficial BeyondTime">
      <div className="support-banner__inner">
        <div className="support-banner__content">
          <span className="support-banner__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <p className="support-banner__text">
            <strong>Dúvidas ou precisa de ajuda?</strong> E-mail oficial de suporte e acolhimento 50+:
            <span className="support-banner__phone"> {SUPPORT_EMAIL}</span>
          </p>
        </div>

        <div className="support-banner__actions">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Apoio%20ao%20Usu%C3%A1rio%20BeyondTime&body=Ol%C3%A1%20equipe%20BeyondTime%2C%20preciso%20de%20ajuda%20com%3A%0A%0A`}
            className="support-banner__btn-whatsapp"
            aria-label={`Enviar e-mail para o suporte oficial (${SUPPORT_EMAIL})`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Enviar E-mail
          </a>

          <button
            type="button"
            className="support-banner__close"
            onClick={() => setClosed(true)}
            aria-label="Ocultar aviso de suporte por enquanto"
            title="Ocultar aviso"
          >
            &times;
          </button>
        </div>
      </div>
    </aside>
  );
}
