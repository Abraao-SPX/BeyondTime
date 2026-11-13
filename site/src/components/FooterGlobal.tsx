import { useState } from 'react';
import type { LegalDocKey } from '../types/auth';

const LEGAL_SUMMARIES: Record<LegalDocKey, string> = {
  terms:
    'Termos de Uso: o BeyondTime promove conexões respeitosas para pessoas 50+, sem garantia absoluta sobre condutas externas.',
  privacy:
    'Política de Privacidade: seus dados de acesso são protegidos conforme a LGPD e utilizados apenas para autenticação e segurança.',
};

export function FooterGlobal() {
  const [activeDoc, setActiveDoc] = useState<LegalDocKey | null>(null);

  function handleSelectDoc(docKey: LegalDocKey) {
    setActiveDoc((current) => (current === docKey ? null : docKey));
  }

  return (
    <footer className="site-footer">
      <p className="site-footer__tagline">Conexões reais. No seu tempo.</p>
      <nav className="site-footer__legal" aria-label="Informações legais">
        <button
          type="button"
          className="site-footer__link"
          onClick={() => handleSelectDoc('terms')}
        >
          Termos de Uso
        </button>
        <button
          type="button"
          className="site-footer__link"
          onClick={() => handleSelectDoc('privacy')}
        >
          Política de Privacidade
        </button>
      </nav>
      {activeDoc !== null && (
        <p className="form-feedback" aria-live="polite">
          {LEGAL_SUMMARIES[activeDoc]}
        </p>
      )}
    </footer>
  );
}
