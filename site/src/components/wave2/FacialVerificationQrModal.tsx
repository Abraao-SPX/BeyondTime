import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  loadAuthSession,
  verifyMyBiometrics,
  type VerifyBiometricsResponse,
} from '../../services/apiClient';

interface FacialVerificationQrModalProps {
  firstName?: string;
  onClose: () => void;
  onVerified?: (result: VerifyBiometricsResponse) => void;
}

interface ChallengePayload {
  session_token: string;
  colors: string[];
  flash_duration_ms: number;
}

interface BiometricsServiceResponse {
  success?: boolean;
  verified?: boolean;
  is_live?: boolean;
  jwt_token?: string | null;
  reason?: string;
  status?: string;
  error?: string;
  detail?: string;
}

const COLOR_HEX: Record<string, string> = {
  VERMELHO: '#FF0000',
  AZUL: '#0000FF',
  VERDE: '#00FF00',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Modal oficial de Verificação Facial Biométrica (RF-11 — Selo de Verificado 50+).
 *
 * Permite duas vias acessíveis para o público 50+:
 * 1. Verificação direta pela câmera do dispositivo (webcam ou celular) com prova de vida
 *    por flash espectral de cores + YuNet/SFace/MiniFASNetV2 + concessão real do selo no Spring Boot.
 * 2. QR Code para abrir a verificação no celular caso o computador não tenha câmera.
 */
export function FacialVerificationQrModal({
  firstName,
  onClose,
  onVerified,
}: FacialVerificationQrModalProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'qr'>('camera');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'approved' | 'error'>('idle');
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    'Posicione seu rosto de frente em um local iluminado e clique em "Iniciar verificação".'
  );

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const biometricsBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_BIOMETRIA_API_URL as string | undefined;
    return configured && configured.trim().length > 0
      ? configured.trim().replace(/\/+$/, '')
      : '/biometrics';
  }, []);

  const verificationUrl = useMemo(() => {
    const configured = import.meta.env.VITE_FACIAL_VERIFICATION_URL as string | undefined;
    return configured && configured.trim().length > 0
      ? configured.trim()
      : window.location.origin;
  }, []);

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
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(
      verificationUrl,
      {
        type: 'svg',
        margin: 2,
        color: { dark: '#5A081D', light: '#FFFFFF' },
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

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) {
      return streamRef.current;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPhase('error');
      setFeedbackMessage(
        'Seu navegador não suporta captura de câmera aqui. Use a aba "Pelo celular (QR Code)".'
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
      setPhase('error');
      setFeedbackMessage(
        'Não foi possível acessar a câmera. Permita o uso da câmera no navegador ou use a aba "Pelo celular (QR Code)".'
      );
      return null;
    }
  }, []);

  const runLiveVerification = useCallback(async () => {
    const session = loadAuthSession();
    if (!session?.accessToken || !session?.userId) {
      setPhase('error');
      setFeedbackMessage(
        'Finalize seu login ou cadastro primeiro para que o Selo de Verificado 50+ seja vinculado à sua conta.'
      );
      return;
    }

    const stream = await startCamera();
    if (!stream) return;

    if (typeof MediaRecorder === 'undefined') {
      setPhase('error');
      setFeedbackMessage(
        'Este navegador não suporta gravação de vídeo para prova de vida. Use o aplicativo no celular.'
      );
      return;
    }

    setPhase('recording');
    setFeedbackMessage('Preparando desafio de prova de vida...');

    try {
      // 1. Solicita desafio dinâmico de cores
      const chRes = await fetch(`${biometricsBaseUrl}/challenge`);
      if (!chRes.ok) {
        throw new Error(`Serviço de biometria indisponível (HTTP ${chRes.status}).`);
      }
      const challenge = (await chRes.json()) as ChallengePayload;

      // 2. Grava vídeo curto durante o flash espectral de cores
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';

      const chunks: BlobPart[] = [];
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
        };
      });

      setFeedbackMessage('Olhe para a câmera sem se mexer enquanto as cores piscam...');
      recorder.start();
      await sleep(250);
      setFlashColor('#000000');
      await sleep(300);

      for (const color of challenge.colors) {
        setFlashColor(COLOR_HEX[color] || '#FFFFFF');
        await sleep(challenge.flash_duration_ms || 500);
      }

      setFlashColor('#000000');
      await sleep(350);
      recorder.stop();
      setFlashColor(null);

      const videoBlob = await recordingDone;
      setPhase('processing');
      setFeedbackMessage('Validando prova de vida (MiniFASNet V2) e identidade facial...');

      // 3. Envia ao microsserviço Python (reconhecimento-facial)
      const form = new FormData();
      form.append('expected_colors', challenge.colors.join(','));
      form.append('session_token', challenge.session_token);
      form.append('user_id', session.userId);
      form.append('name', (firstName || session.email.split('@')[0] || 'Usuário').trim());
      form.append('video', videoBlob, 'liveness.webm');

      const bioRes = await fetch(`${biometricsBaseUrl}/register`, {
        method: 'POST',
        body: form,
      });
      const bioData = (await bioRes.json().catch(() => ({}))) as BiometricsServiceResponse;

      if (bioRes.status === 429) {
        throw new Error('Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.');
      }
      if (!bioRes.ok || !bioData.success || !bioData.jwt_token) {
        throw new Error(
          bioData.reason || bioData.detail || bioData.error || 'Prova de vida não aprovada. Tente em um local mais iluminado.'
        );
      }

      // 4. Envia o token biométrico assinado ao backend Java para conceder o Selo de Verificado 50+
      setFeedbackMessage('Gravando Selo de Verificado 50+ no seu perfil...');
      const verifiedResponse = await verifyMyBiometrics(session, bioData.jwt_token);

      stopCamera();
      setPhase('approved');
      setFeedbackMessage(
        verifiedResponse.message || 'Parabéns! Seu perfil recebeu o Selo de Verificado 50+.'
      );
      onVerified?.(verifiedResponse);
    } catch (err) {
      setFlashColor(null);
      setPhase('error');
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a verificação facial agora.';
      setFeedbackMessage(message);
    }
  }, [biometricsBaseUrl, firstName, onVerified, startCamera, stopCamera]);

  return (
    <div
      className="defensive-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget && phase !== 'recording' && phase !== 'processing') {
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
            Validação facial com prova de vida
          </h2>
          <p className="facial-qr-modal__subtitle">
            Confirme que você é uma pessoa real em 3 segundos para receber o Selo de Verificado 50+.
          </p>

          <div
            role="tablist"
            aria-label="Forma de verificação facial"
            style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'camera'}
              className={`btn ${activeMode === 'camera' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ minHeight: '48px' }}
              onClick={() => setActiveMode('camera')}
            >
              Usar câmera agora
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'qr'}
              className={`btn ${activeMode === 'qr' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ minHeight: '48px' }}
              onClick={() => {
                stopCamera();
                setActiveMode('qr');
              }}
            >
              Pelo celular (QR Code)
            </button>
          </div>
        </header>

        <div className="facial-qr-modal__body">
          {activeMode === 'camera' ? (
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
                    {phase === 'approved'
                      ? 'Selo de Verificado 50+ aprovado!'
                      : 'Clique abaixo para ativar sua câmera frontal e iniciar a prova de vida.'}
                  </p>
                )}
              </div>

              <div className="facial-qr-modal__status-box" role="status" aria-live="polite">
                <span>{feedbackMessage}</span>
              </div>

              <footer className="facial-qr-modal__actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {phase !== 'approved' && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ minHeight: '48px' }}
                    disabled={phase === 'recording' || phase === 'processing'}
                    onClick={runLiveVerification}
                  >
                    {phase === 'recording'
                      ? 'Gravando prova de vida...'
                      : phase === 'processing'
                        ? 'Validando biometria...'
                        : 'Iniciar verificação'}
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  type="button"
                  className={phase === 'approved' ? 'btn btn--primary' : 'btn btn--secondary'}
                  style={{ minHeight: '48px' }}
                  disabled={phase === 'recording' || phase === 'processing'}
                  onClick={handleClose}
                >
                  {phase === 'approved' ? 'Concluir' : 'Voltar'}
                </button>
              </footer>
            </div>
          ) : (
            <>
              <div className="facial-qr-modal__grid">
                <div className="facial-qr-modal__qr-container">
                  <div
                    className="facial-qr-modal__qr-box"
                    role="img"
                    aria-label="Código QR da verificação facial pelo celular"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
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
                        <p>A prova de vida confirma que você é real e libera o Selo de Verificado 50+.</p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>

              <footer className="facial-qr-modal__actions">
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn btn--primary"
                  style={{ minHeight: '48px' }}
                  onClick={handleClose}
                >
                  Voltar
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
