import { useEffect, useId, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface FacialVerificationQrModalProps {
  onClose: () => void;
}

/**
 * Pré-visualização da verificação facial pelo celular (RF-11 / Onda 3).
 *
 * Importante: este modal NÃO concede o Selo de Verificado 50+.
 * O selo só pode vir do backend (campo `verifiedBadge50plus` do perfil),
 * após a API biométrica do RF-11 ser integrada. Até lá, o QR Code serve
 * apenas para apresentar o fluxo ao usuário.
 */
export function FacialVerificationQrModal({ onClose }: FacialVerificationQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const verificationUrl = useMemo(() => {
    const configured = import.meta.env.VITE_FACIAL_VERIFICATION_URL as string | undefined;
    return configured && configured.trim().length > 0
      ? configured.trim()
      : window.location.origin;
  }, []);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      verificationUrl,
      {
        margin: 2,
        width: 240,
        color: { dark: '#5A081D', light: '#FFFFFF' },
      },
      (error, dataUrl) => {
        if (!error && dataUrl && isMounted) {
          setQrDataUrl(dataUrl);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [verificationUrl]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="defensive-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="facial-qr-modal">
        <header className="facial-qr-modal__header">
          <div className="facial-qr-modal__badge" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Selo de Verificado 50+</span>
          </div>

          <h2 id={titleId} className="facial-qr-modal__title">
            Verificação facial pelo celular
          </h2>
          <p className="facial-qr-modal__subtitle">
            Em breve você poderá apontar a câmera do celular para este código e confirmar que é
            você, de forma rápida e segura.
          </p>
        </header>

        <div className="facial-qr-modal__body">
          <div className="facial-qr-modal__grid">
            <div className="facial-qr-modal__qr-container">
              <div className="facial-qr-modal__qr-box">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR da verificação facial pelo celular"
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                  />
                ) : null}
              </div>
              <span className="facial-qr-modal__qr-hint">Código de verificação BeyondTime</span>
            </div>

            <div className="facial-qr-modal__steps">
              <ol className="facial-qr-modal__steps-list">
                <li className="facial-qr-modal__step-item">
                  <span className="facial-qr-modal__step-num" aria-hidden="true">1</span>
                  <div>
                    <strong>Abra a câmera do celular</strong>
                    <p>Aponte a câmera diretamente para a tela do computador.</p>
                  </div>
                </li>
                <li className="facial-qr-modal__step-item">
                  <span className="facial-qr-modal__step-num" aria-hidden="true">2</span>
                  <div>
                    <strong>Toque no link que aparecer</strong>
                    <p>Ele abre a página segura de verificação no celular.</p>
                  </div>
                </li>
                <li className="facial-qr-modal__step-item">
                  <span className="facial-qr-modal__step-num" aria-hidden="true">3</span>
                  <div>
                    <strong>Posicione seu rosto</strong>
                    <p>Uma selfie rápida confirma que você é real e protege a comunidade.</p>
                  </div>
                </li>
              </ol>

              <div className="facial-qr-modal__status-box" role="status">
                <span>
                  Esta etapa ainda está em preparação. Seu cadastro continua normalmente e você
                  poderá fazer a verificação depois, em Meu Perfil.
                </span>
              </div>
            </div>
          </div>

          <footer className="facial-qr-modal__actions">
            <button
              ref={closeButtonRef}
              type="button"
              className="btn btn--primary"
              onClick={onClose}
            >
              Entendi
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
