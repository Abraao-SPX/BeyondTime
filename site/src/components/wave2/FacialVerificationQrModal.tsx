import { useEffect, useMemo, useState, useId } from 'react';
import QRCode from 'qrcode';

interface FacialVerificationQrModalProps {
  userName?: string;
  onVerified: () => void;
  onClose: () => void;
}

export function FacialVerificationQrModal({
  userName,
  onVerified,
  onClose,
}: FacialVerificationQrModalProps) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const titleId = useId();

  // URL estável com token de sessão único para a leitura móvel
  const verificationUrl = useMemo(() => {
    return `https://beyondtime.com.br/verificar-biometria?sessao=bt_${Date.now()}&usuario=${encodeURIComponent(
      userName || 'membro_beyondtime'
    )}`;
  }, [userName]);

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(
      verificationUrl,
      {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#5A081D', // Tom vinho característico do BeyondTime
          light: '#FFFFFF',
        },
      },
      (error, svgString) => {
        if (!error && svgString && isMounted) {
          setQrSvg(svgString);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [verificationUrl]);

  function handleSimulateCompletion() {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsDone(true);
      onVerified();
    }, 1200);
  }

  return (
    <div
      className="defensive-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Selo de Verificado 50+</span>
          </div>

          <h2 id={titleId} className="facial-qr-modal__title">
            Verificação Facial Anti-Golpe
          </h2>
          <p className="facial-qr-modal__subtitle">
            Aponte a câmera do seu celular para o código abaixo para fazer o reconhecimento
            facial com prova de vida no seu smartphone.
          </p>
        </header>

        {isDone ? (
          <div className="facial-qr-modal__success" role="status">
            <div className="facial-qr-modal__success-icon" aria-hidden="true">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3>Identidade Verificada com Sucesso!</h3>
            <p>
              O <strong>Selo de Verificado 50+</strong> foi concedido ao seu perfil. Seus contatos
              em Descobrir e Conversas agora sabem que você é uma pessoa real.
            </p>
            <button
              type="button"
              className="btn btn--primary facial-qr-modal__btn-finish"
              onClick={onClose}
            >
              Concluir e Voltar
            </button>
          </div>
        ) : (
          <div className="facial-qr-modal__body">
            <div className="facial-qr-modal__grid">
              {/* Box do QR Code */}
              <div className="facial-qr-modal__qr-container">
                <div
                  className="facial-qr-modal__qr-box"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  aria-label="Código QR para leitura com a câmera do celular"
                />
                <span className="facial-qr-modal__qr-hint">
                  Código de verificação BeyondTime
                </span>
              </div>

              {/* Instruções passo a passo */}
              <div className="facial-qr-modal__steps">
                <ol className="facial-qr-modal__steps-list">
                  <li className="facial-qr-modal__step-item">
                    <span className="facial-qr-modal__step-num" aria-hidden="true">
                      1
                    </span>
                    <div>
                      <strong>Abra a câmera do celular</strong>
                      <p>Aponte a lente fotográfica diretamente para a tela do computador.</p>
                    </div>
                  </li>
                  <li className="facial-qr-modal__step-item">
                    <span className="facial-qr-modal__step-num" aria-hidden="true">
                      2
                    </span>
                    <div>
                      <strong>Toque no link que surgir</strong>
                      <p>
                        Uma notificação amigável abrirá a página de verificação facial segura.
                      </p>
                    </div>
                  </li>
                  <li className="facial-qr-modal__step-item">
                    <span className="facial-qr-modal__step-num" aria-hidden="true">
                      3
                    </span>
                    <div>
                      <strong>Posicione seu rosto e sorria</strong>
                      <p>
                        A prova de vida confirma que você é real e protege a comunidade contra
                        falsos perfis.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="facial-qr-modal__status-box">
                  <div className="facial-qr-modal__pulse-dot" aria-hidden="true" />
                  <span>
                    {isVerifying
                      ? 'Processando reconhecimento no celular...'
                      : 'Aguardando leitura do celular...'}
                  </span>
                </div>
              </div>
            </div>

            <footer className="facial-qr-modal__actions">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={isVerifying}
                onClick={handleSimulateCompletion}
              >
                {isVerifying ? 'Validando...' : 'Já apontei e confirmei no celular'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                disabled={isVerifying}
                onClick={onClose}
              >
                Fazer isso mais tarde
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
