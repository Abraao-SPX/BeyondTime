import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  createBiometricHandoff,
  fetchBiometricHandoffStatus,
  loadAuthSession,
  verifyMyBiometrics,
  type VerifyBiometricsResponse,
} from '../../services/apiClient';
import type { AuthSession } from '../../types/auth';
import {
  isMobileDevice,
  recordAndSubmitLiveness,
  resolveBiometricsBaseUrl,
} from '../../utils/biometricCapture';

interface FacialVerificationQrModalProps {
  authSession?: AuthSession | null;
  firstName?: string;
  onClose: () => void;
  onVerified?: (result: VerifyBiometricsResponse) => void;
}

/**
 * Modal oficial de Verificação Facial Biométrica (RF-11 — Selo de Verificado 50+).
 *
 * Comportamento inteligente por dispositivo:
 * - No PC/Desktop: abre direto no QR Code com sessão efêmera de handoff (5 min, uso único).
 *   O usuário aponta a câmera do celular, faz a verificação no navegador (sem baixar app nem logar de novo)
 *   e o PC detecta automaticamente a aprovação em tempo real via polling.
 * - No celular (navegador): abre direto na câmera frontal.
 * - No PC sem celular por perto: oferece plano B discreto ("Usar a câmera deste computador").
 */
export function FacialVerificationQrModal({
  authSession: propSession = null,
  firstName,
  onClose,
  onVerified,
}: FacialVerificationQrModalProps) {
  const resolveActiveSession = useCallback(
    () => propSession ?? loadAuthSession(),
    [propSession]
  );
  const defaultMode = useMemo<'qr' | 'camera'>(() => (isMobileDevice() ? 'camera' : 'qr'), []);
  const [activeMode, setActiveMode] = useState<'qr' | 'camera'>(defaultMode);

  // Estado do fluxo QR Handoff (PC -> Celular sem app)
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const [handoffState, setHandoffState] = useState<
    'creating' | 'waiting' | 'approved' | 'expired' | 'unauthenticated' | 'error'
  >('creating');
  const [handoffMessage, setHandoffMessage] = useState<string>(
    'Gerando código QR seguro para o seu celular...'
  );

  // Estado do fluxo câmera local (celular ou webcam no PC)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPhase, setCameraPhase] = useState<'idle' | 'recording' | 'processing' | 'approved' | 'error'>('idle');
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState<string>(
    'Posicione seu rosto de frente em um local iluminado e clique em "Iniciar verificação".'
  );

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const notifiedVerifiedRef = useRef(false);
  const onVerifiedRef = useRef(onVerified);
  const handoffRequestSeqRef = useRef(0);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const biometricsBaseUrl = useMemo(() => resolveBiometricsBaseUrl(), []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => stopCamera();
  }, [stopCamera]);

  // Cria uma nova sessão de handoff QR no backend quando em modo QR
  const initQrHandoff = useCallback(async () => {
    const requestSeq = ++handoffRequestSeqRef.current;
    const session = resolveActiveSession();
    if (!session?.accessToken || !session?.userId || session.userId === 'dev-preview-50plus') {
      setHandoffToken(null);
      setHandoffState('unauthenticated');
      setHandoffMessage(
        'Conclua seu cadastro ou faça login para gerar seu código QR pessoal de verificação facial.'
      );
      return;
    }

    setHandoffState('creating');
    setHandoffMessage('Gerando código QR seguro para o seu celular...');

    try {
      const created = await createBiometricHandoff(session);
      if (handoffRequestSeqRef.current !== requestSeq) return;
      setHandoffToken(created.handoffToken);
      setHandoffState('waiting');
      setHandoffMessage(
        'Aguardando você apontar a câmera do celular para o código ao lado (válido por 5 minutos).'
      );
    } catch (err) {
      if (handoffRequestSeqRef.current !== requestSeq) return;
      setHandoffToken(null);
      setHandoffState('error');
      setHandoffMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o código QR agora. Tente novamente.'
      );
    }
  }, [resolveActiveSession]);

  useEffect(() => {
    if (activeMode === 'qr') {
      void initQrHandoff();
    } else {
      handoffRequestSeqRef.current += 1;
    }
  }, [activeMode, initQrHandoff]);

  // Renderiza o SVG do QR Code apontando para /verificar-rosto?t=<handoffToken>
  const qrTargetUrl = useMemo(() => {
    const configuredOrigin = (import.meta.env.VITE_FACIAL_VERIFICATION_URL as string | undefined)
      ?.trim()
      .replace(/\/+$/, '');
    const baseOrigin =
      configuredOrigin && configuredOrigin.length > 0 ? configuredOrigin : window.location.origin;

    if (handoffToken) {
      return `${baseOrigin}/verificar-rosto?t=${encodeURIComponent(handoffToken)}`;
    }
    return baseOrigin;
  }, [handoffToken]);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      qrTargetUrl,
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
  }, [qrTargetUrl]);

  // Polling leve (2,5s) no PC para detectar automaticamente quando o celular concluir
  useEffect(() => {
    if (activeMode !== 'qr' || handoffState !== 'waiting' || !handoffToken) {
      return;
    }
    const session = resolveActiveSession();
    if (!session?.accessToken) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const statusRes = await fetchBiometricHandoffStatus(session, handoffToken);
        if (cancelled) return;

        if (statusRes.status === 'COMPLETED' || statusRes.verifiedBadge50plus) {
          setHandoffState('approved');
          setHandoffMessage(
            'Verificação concluída pelo celular! Seu perfil agora possui o Selo de Verificado 50+.'
          );
          if (!notifiedVerifiedRef.current) {
            notifiedVerifiedRef.current = true;
            onVerifiedRef.current?.({
              success: true,
              message: 'Selo de Verificado 50+ concedido com sucesso.',
              profileId: '',
              userId: session.userId,
              verifiedBadge50plus: true,
              verificationStatus: 'VERIFIED',
              verifiedAt: statusRes.completedAt ?? new Date().toISOString(),
              livenessPassed: true,
            });
          }
        } else if (statusRes.status === 'EXPIRED') {
          setHandoffState('expired');
          setHandoffMessage('Este código QR expirou. Clique em "Gerar novo código" para continuar.');
        }
      } catch {
        // Ignora erro transitório de rede durante o polling
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeMode, handoffState, handoffToken, resolveActiveSession]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && cameraPhase !== 'recording' && cameraPhase !== 'processing') {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cameraPhase, handleClose]);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPhase('error');
      setCameraMessage(
        'Seu navegador não suporta captura de câmera aqui. Use a opção "Pelo celular (QR Code)".'
      );
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      return stream;
    } catch {
      setCameraPhase('error');
      setCameraMessage(
        'Não foi possível acessar a câmera deste dispositivo. Permita a câmera ou use "Pelo celular (QR Code)".'
      );
      return null;
    }
  }, []);

  const runLiveCameraVerification = useCallback(async () => {
    const session = resolveActiveSession();
    if (!session?.accessToken || !session?.userId) {
      setCameraPhase('error');
      setCameraMessage(
        'Finalize seu login ou cadastro primeiro para vincular o Selo de Verificado 50+ à sua conta.'
      );
      return;
    }

    const stream = await startCamera();
    if (!stream) return;

    setCameraPhase('recording');
    try {
      const biometricJwt = await recordAndSubmitLiveness({
        stream,
        biometricsBaseUrl,
        userId: session.userId,
        firstName: (firstName || session.email.split('@')[0] || 'Usuário').trim(),
        onStatus: (msg) => {
          setCameraMessage(msg);
          if (msg.includes('Validando')) setCameraPhase('processing');
        },
        onFlashColor: setFlashColor,
      });

      setCameraPhase('processing');
      setCameraMessage('Gravando Selo de Verificado 50+ no seu perfil...');
      const verifiedResponse = await verifyMyBiometrics(session, biometricJwt);

      stopCamera();
      setCameraPhase('approved');
      setCameraMessage(
        verifiedResponse.message || 'Parabéns! Seu perfil recebeu o Selo de Verificado 50+.'
      );
      if (!notifiedVerifiedRef.current) {
        notifiedVerifiedRef.current = true;
        onVerified?.(verifiedResponse);
      }
    } catch (err) {
      setFlashColor(null);
      setCameraPhase('error');
      setCameraMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a verificação facial agora.'
      );
    }
  }, [biometricsBaseUrl, firstName, onVerified, resolveActiveSession, startCamera, stopCamera]);

  const isBusy = cameraPhase === 'recording' || cameraPhase === 'processing';
  const isApproved = handoffState === 'approved' || cameraPhase === 'approved';

  return (
    <div
      className="defensive-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          handleClose();
        }
      }}
    >
      {flashColor && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: flashColor,
            opacity: 0.78,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}

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
            {activeMode === 'qr'
              ? 'Verificação facial pelo celular'
              : 'Verificação facial pela câmera'}
          </h2>
          <p className="facial-qr-modal__subtitle">
            {activeMode === 'qr'
              ? 'Aponte a câmera do celular para o código abaixo. Não precisa baixar aplicativo nem fazer login novamente.'
              : 'Confirme que você é uma pessoa real em 3 segundos para receber o Selo de Verificado 50+.'}
          </p>
        </header>

        <div className="facial-qr-modal__body">
          {activeMode === 'qr' ? (
            <>
              <div className="facial-qr-modal__grid">
                <div className="facial-qr-modal__qr-container">
                  <div
                    className="facial-qr-modal__qr-box"
                    style={{
                      opacity: handoffState === 'expired' || handoffState === 'creating' ? 0.35 : 1,
                    }}
                  >
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Código QR da verificação facial pelo navegador do celular"
                        width={220}
                        height={220}
                        style={{ display: 'block', width: '100%', height: 'auto' }}
                      />
                    )}
                  </div>
                  <span className="facial-qr-modal__qr-hint">
                    {handoffState === 'approved'
                      ? 'Verificação aprovada!'
                      : 'Sem aplicativo — abre direto no navegador'}
                  </span>
                </div>

                <div className="facial-qr-modal__steps">
                  <ol className="facial-qr-modal__steps-list">
                    <li className="facial-qr-modal__step-item">
                      <span className="facial-qr-modal__step-num" aria-hidden="true">1</span>
                      <div>
                        <strong>Abra a câmera do celular</strong>
                        <p>Aponte a câmera diretamente para o código QR na tela do computador.</p>
                      </div>
                    </li>
                    <li className="facial-qr-modal__step-item">
                      <span className="facial-qr-modal__step-num" aria-hidden="true">2</span>
                      <div>
                        <strong>Toque no link que aparecer</strong>
                        <p>Ele abre a página segura no navegador do celular, sem baixar app.</p>
                      </div>
                    </li>
                    <li className="facial-qr-modal__step-item">
                      <span className="facial-qr-modal__step-num" aria-hidden="true">3</span>
                      <div>
                        <strong>Faça a prova de vida rápida</strong>
                        <p>Assim que terminar no celular, esta tela atualiza sozinha com seu selo.</p>
                      </div>
                    </li>
                  </ol>

                  <div className="facial-qr-modal__status-box" role="status" aria-live="polite">
                    <span>{handoffMessage}</span>
                  </div>
                </div>
              </div>

              <footer
                className="facial-qr-modal__actions"
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(handoffState === 'expired' || handoffState === 'error') && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      style={{ minHeight: '48px' }}
                      onClick={() => void initQrHandoff()}
                    >
                      Gerar novo código
                    </button>
                  )}
                  {!isApproved && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      style={{ minHeight: '48px' }}
                      onClick={() => setActiveMode('camera')}
                    >
                      Usar a câmera deste computador
                    </button>
                  )}
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn btn--primary"
                  style={{ minHeight: '48px' }}
                  onClick={handleClose}
                >
                  {isApproved ? 'Concluir' : 'Voltar'}
                </button>
              </footer>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  aspectRatio: '4 / 3',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#111827',
                  border: '2px solid var(--border-subtle, #D1D5DB)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: cameraActive ? 'block' : 'none',
                  }}
                />
                {!cameraActive && (
                  <p style={{ color: '#F9FAFB', padding: '16px', textAlign: 'center', margin: 0 }}>
                    {cameraPhase === 'approved'
                      ? 'Selo de Verificado 50+ aprovado!'
                      : 'Clique abaixo para ativar a câmera e iniciar a prova de vida.'}
                  </p>
                )}
              </div>

              <div className="facial-qr-modal__status-box" role="status" aria-live="polite">
                <span>{cameraMessage}</span>
              </div>

              <footer
                className="facial-qr-modal__actions"
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}
              >
                {cameraPhase !== 'approved' && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ minHeight: '48px' }}
                    disabled={isBusy}
                    onClick={runLiveCameraVerification}
                  >
                    {cameraPhase === 'recording'
                      ? 'Gravando prova de vida...'
                      : cameraPhase === 'processing'
                        ? 'Validando biometria...'
                        : 'Iniciar verificação'}
                  </button>
                )}
                {!isApproved && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{ minHeight: '48px' }}
                    disabled={isBusy}
                    onClick={() => {
                      stopCamera();
                      setActiveMode('qr');
                    }}
                  >
                    Fazer pelo celular (QR Code)
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  type="button"
                  className={isApproved ? 'btn btn--primary' : 'btn btn--secondary'}
                  style={{ minHeight: '48px' }}
                  disabled={isBusy}
                  onClick={handleClose}
                >
                  {isApproved ? 'Concluir' : 'Voltar'}
                </button>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
