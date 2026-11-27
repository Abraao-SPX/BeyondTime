import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  createBiometricHandoff,
  fetchBiometricHandoffStatus,
  loadAuthSession,
  type VerifyBiometricsResponse,
} from '../../services/apiClient';
import type { AuthSession } from '../../types/auth';
import {
  checkFaceAlignment,
  isMobileDevice,
  recordLivenessVideo,
  resolveBiometricsBaseUrl,
  submitAuthedLivenessVideo,
} from '../../utils/biometricCapture';

interface FacialVerificationQrModalProps {
  authSession?: AuthSession | null;
  firstName?: string;
  onClose: () => void;
  onVerified?: (result: VerifyBiometricsResponse) => void;
}

/**
 * Modal oficial de Verificação Facial Biométrica (RF-11 — Selo de Verificado 50+).
 * - No PC/Desktop: exibe exclusivamente o QR Code para verificação pelo navegador do celular (sem opção de câmera no PC).
 * - No celular (navegador): abre a câmera frontal com auto-detecção de rosto OU botão "Começar",
 *   contagem regressiva de 3 segundos e tela cheia 100% limpa mostrando só o rosto no oval durante os flashes.
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

  // Estado do fluxo câmera local (apenas quando aberto direto no navegador do celular)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPhase, setCameraPhase] = useState<
    'idle' | 'countdown' | 'recording' | 'processing' | 'approved' | 'error'
  >('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState<string>(
    'Posicione seu rosto no oval ou toque em Começar.'
  );

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const notifiedVerifiedRef = useRef(false);
  const onVerifiedRef = useRef(onVerified);
  const handoffRequestSeqRef = useRef(0);
  const sequenceLockRef = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const biometricsBaseUrl = useMemo(() => resolveBiometricsBaseUrl(), []);

  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearCountdownTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, [clearCountdownTimer]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => stopCamera();
  }, [stopCamera]);

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

  const startCamera = useCallback(async (silentFail: boolean = false): Promise<MediaStream | null> => {
    if (streamRef.current) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      return streamRef.current;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!silentFail) {
        setCameraPhase('error');
        setCameraMessage(
          'Seu navegador não suporta captura de câmera aqui. Use a opção pelo código QR.'
        );
      }
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
      if (!silentFail) {
        setCameraPhase('error');
        setCameraMessage(
          'Permita o uso da câmera na barra do navegador e toque em "Começar".'
        );
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (activeMode === 'qr') {
      void initQrHandoff();
    } else {
      handoffRequestSeqRef.current += 1;
      void startCamera(true);
    }
  }, [activeMode, initQrHandoff, startCamera]);

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

  // Polling (2,5s) no PC — aguarda estritamente status === 'COMPLETED' desta sessão QR
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

        if (statusRes.status === 'COMPLETED') {
          setHandoffState('approved');
          setHandoffMessage('Identidade confirmada pelo celular com sucesso!');
          if (!notifiedVerifiedRef.current) {
            notifiedVerifiedRef.current = true;
            onVerifiedRef.current?.({
              success: true,
              message: 'Verificação facial concluída com sucesso.',
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

  const executeLiveCameraRecording = useCallback(
    async (stream: MediaStream) => {
      const session = resolveActiveSession();
      if (!session?.accessToken || !session?.userId) {
        sequenceLockRef.current = false;
        setCameraPhase('error');
        setCameraMessage('Faça login primeiro para validar sua biometria.');
        return;
      }

      setCameraPhase('recording');
      setCountdown(null);
      try {
        const recorded = await recordLivenessVideo({
          stream,
          biometricsBaseUrl,
          onStatus: (msg) => setCameraMessage(msg),
          onFlashColor: setFlashColor,
        });

        setCameraPhase('processing');
        setCameraMessage('Validando biometria com segurança no servidor...');
        const verifiedResponse = await submitAuthedLivenessVideo(session, recorded);

        stopCamera();
        setCameraPhase('approved');
        setCameraMessage(verifiedResponse.message || 'Identidade confirmada com sucesso!');
        if (!notifiedVerifiedRef.current) {
          notifiedVerifiedRef.current = true;
          onVerified?.(verifiedResponse);
        }
      } catch (err) {
        setFlashColor(null);
        setCountdown(null);
        sequenceLockRef.current = false;
        setCameraPhase('error');
        setCameraMessage(
          err instanceof Error
            ? err.message
            : 'Não foi possível concluir a verificação facial agora.'
        );
      }
    },
    [biometricsBaseUrl, firstName, onVerified, resolveActiveSession, stopCamera]
  );

  const triggerCameraCountdown = useCallback(async () => {
    if (sequenceLockRef.current) return;
    sequenceLockRef.current = true;

    const stream = await startCamera(false);
    if (!stream) {
      sequenceLockRef.current = false;
      return;
    }

    clearCountdownTimer();
    setFlashColor(null);
    setCountdown(3);
    setCameraPhase('countdown');

    let remaining = 3;
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        clearCountdownTimer();
        setCountdown(null);
        void executeLiveCameraRecording(stream);
      }
    }, 1000);
  }, [clearCountdownTimer, executeLiveCameraRecording, startCamera]);

  // Auto-detecção do rosto no modo câmera do celular
  useEffect(() => {
    if (activeMode !== 'camera' || cameraPhase !== 'idle' || !cameraActive || sequenceLockRef.current) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const interval = window.setInterval(async () => {
      if (cancelled || inFlight || sequenceLockRef.current) return;
      inFlight = true;
      try {
        const res = await checkFaceAlignment(videoRef.current, biometricsBaseUrl);
        if (cancelled || sequenceLockRef.current) return;
        if (res.detected && res.centered) {
          void triggerCameraCountdown();
        }
      } finally {
        inFlight = false;
      }
    }, 950);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeMode, biometricsBaseUrl, cameraActive, cameraPhase, triggerCameraCountdown]);

  const isBusy =
    cameraPhase === 'countdown' || cameraPhase === 'recording' || cameraPhase === 'processing';
  const isApproved = handoffState === 'approved' || cameraPhase === 'approved';

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isBusy) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, isBusy]);

  // Tela cheia 100% limpa no celular durante contagem 3s + flashes de cor fortes (só o rosto no oval)
  if (activeMode === 'camera' && (cameraPhase === 'countdown' || cameraPhase === 'recording')) {
    const isColorFlash = cameraPhase === 'recording' && flashColor !== null && flashColor !== '#000000';
    const activeBg = flashColor || '#050811';
    const ovalBorderColor = cameraPhase === 'countdown' ? '#10B981' : isColorFlash ? activeBg : '#FFFFFF';

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Verificação facial em andamento"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          backgroundColor: activeBg,
          transition: 'background-color 120ms linear',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: isColorFlash ? 'min(54vw, 210px)' : 'min(74vw, 300px)',
            height: isColorFlash ? 'min(36dvh, 265px)' : 'min(56dvh, 400px)',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `4px solid ${ovalBorderColor}`,
            boxShadow: isColorFlash
              ? `0 0 80px 30px ${activeBg}`
              : '0 0 32px rgba(0, 0, 0, 0.35)',
            transition: 'width 160ms ease, height 160ms ease',
            position: 'relative',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={attachVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: 'block',
            }}
          />

          {isColorFlash && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: activeBg,
                opacity: 0.45,
                pointerEvents: 'none',
              }}
            />
          )}

          {cameraPhase === 'countdown' && countdown !== null && (
            <div
              aria-live="assertive"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.22)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: '4.5rem',
                  fontWeight: 800,
                  textShadow: '0 4px 18px rgba(0, 0, 0, 0.75)',
                  lineHeight: 1,
                }}
              >
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              : 'Posicione o rosto no oval ou toque em Começar.'}
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
                        <strong>Confirme seu rosto no celular</strong>
                        <p>Assim que concluir no celular, esta tela entra automaticamente.</p>
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
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
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
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn btn--primary"
                  style={{ minHeight: '48px', width: '100%' }}
                  onClick={handleClose}
                >
                  {isApproved ? 'Concluir' : 'Voltar'}
                </button>
              </footer>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div
                onClick={() => {
                  if (cameraPhase === 'idle' || cameraPhase === 'error') {
                    void triggerCameraCountdown();
                  }
                }}
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  aspectRatio: '3 / 4',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  backgroundColor: '#111827',
                  border: '2px solid var(--border-subtle, #D1D5DB)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <video
                  ref={attachVideoRef}
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
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    width: '68%',
                    height: '76%',
                    borderRadius: '50%',
                    border: '3px dashed rgba(255,255,255,0.9)',
                    pointerEvents: 'none',
                  }}
                />
                {!cameraActive && (
                  <p style={{ color: '#F9FAFB', padding: '16px', textAlign: 'center', margin: 0 }}>
                    {cameraPhase === 'approved'
                      ? 'Verificação aprovada!'
                      : 'Toque em Começar abaixo para abrir a câmera.'}
                  </p>
                )}
              </div>

              <div className="facial-qr-modal__status-box" role="status" aria-live="polite">
                <span>{cameraMessage}</span>
              </div>

              <footer
                className="facial-qr-modal__actions"
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}
              >
                {cameraPhase !== 'approved' && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ minHeight: '48px' }}
                    disabled={isBusy}
                    onClick={() => void triggerCameraCountdown()}
                  >
                    {cameraPhase === 'processing'
                      ? 'Reconhecendo seu rosto...'
                      : cameraPhase === 'error'
                        ? 'Tentar novamente'
                        : 'Começar'}
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
                    Fazer por código QR
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
