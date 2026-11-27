import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  fetchPublicBiometricHandoff,
  type BiometricHandoffSessionInfoResponse,
} from '../../services/apiClient';
import {
  checkFaceAlignment,
  checkHandoffEnrollmentStatus,
  recordLivenessVideo,
  resolveBiometricsBaseUrl,
  submitHandoffLivenessVideo,
} from '../../utils/biometricCapture';

type HandoffPageStage =
  | 'loading'
  | 'ready'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'approved'
  | 'expired'
  | 'error';

/**
 * RF-11 — Página móvel dedicada para cadastro/reconhecimento facial via QR Code (sem instalar app).
 * - Inicia automaticamente ao detectar o rosto centralizado no oval OU quando o usuário toca em "Começar".
 * - Aguarda contagem regressiva de 3 segundos (3, 2, 1) antes de iniciar os flashes suaves.
 * - Durante a contagem e os flashes de cor, oculta todos os cartões/textos/botões e exibe
 *   exclusivamente o rosto da pessoa dentro da moldura oval com a tela inteira iluminando as cores.
 */
export function MobileFacialHandoffPage() {
  const handoffToken = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('t')?.trim() || '';
  }, []);

  const biometricsBaseUrl = useMemo(() => resolveBiometricsBaseUrl(), []);

  const [stage, setStage] = useState<HandoffPageStage>('loading');
  const [sessionInfo, setSessionInfo] = useState<BiometricHandoffSessionInfoResponse | null>(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Carregando verificação segura...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sequenceLockRef = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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
        setStage('error');
        setMessage(
          'Não foi possível abrir a câmera neste navegador. Verifique se você abriu o link por HTTPS no Chrome, Brave ou Safari.'
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
        setStage('error');
        setMessage(
          'Permissão da câmera negada. Permita o uso da câmera na barra do navegador e toque em "Começar".'
        );
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!handoffToken) {
      setStage('expired');
      setMessage('Código QR inválido ou incompleto. Escaneie novamente o código na tela do computador.');
      return;
    }

    let cancelled = false;
    fetchPublicBiometricHandoff(handoffToken)
      .then(async (info) => {
        if (cancelled) return;
        setSessionInfo(info);
        const enrolled = await checkHandoffEnrollmentStatus(handoffToken);
        if (cancelled) return;
        setIsAlreadyEnrolled(enrolled);
        setStage('ready');
        setMessage(
          enrolled
            ? 'Posicione seu rosto no oval ou toque em Começar para confirmar sua identidade.'
            : 'Posicione seu rosto no oval ou toque em Começar para cadastrar sua biometria.'
        );
        // Tenta abrir a câmera frontal imediatamente para permitir auto-detecção do rosto
        void startCamera(true);
      })
      .catch((err) => {
        if (cancelled) return;
        const text =
          err instanceof ApiError
            ? err.message
            : 'Este código QR expirou ou já foi utilizado. Gere um novo código no computador.';
        setStage('expired');
        setMessage(text);
      });

    return () => {
      cancelled = true;
    };
  }, [biometricsBaseUrl, handoffToken, startCamera]);

  const executeRecordingSequence = useCallback(
    async (stream: MediaStream) => {
      if (!sessionInfo || !handoffToken) return;

      setStage('recording');
      setCountdown(null);
      try {
        const recorded = await recordLivenessVideo({
          stream,
          biometricsBaseUrl,
          onStatus: (statusMsg) => setMessage(statusMsg),
          onFlashColor: setFlashColor,
        });

        setStage('processing');
        setMessage(
          isAlreadyEnrolled
            ? 'Reconhecendo seu rosto e validando anti-golpe...'
            : 'Cadastrando seu rosto e validando prova de vida...'
        );
        await submitHandoffLivenessVideo(handoffToken, recorded);

        stopCamera();
        setStage('approved');
        setMessage(
          isAlreadyEnrolled
            ? 'Identidade reconhecida com sucesso! Você já pode voltar para o computador.'
            : 'Biometria cadastrada e Selo de Verificado 50+ ativado! Você já pode voltar para o computador.'
        );
      } catch (err) {
        setFlashColor(null);
        setCountdown(null);
        sequenceLockRef.current = false;
        setStage('error');
        const errMsg =
          err instanceof Error
            ? err.message
            : 'Não foi possível concluir a verificação. Tente novamente de frente para a tela.';
        setMessage(errMsg);
      }
    },
    [biometricsBaseUrl, handoffToken, isAlreadyEnrolled, sessionInfo, stopCamera]
  );

  const triggerCountdownAndCapture = useCallback(async () => {
    if (sequenceLockRef.current || !sessionInfo || !handoffToken) return;
    sequenceLockRef.current = true;

    const stream = await startCamera(false);
    if (!stream) {
      sequenceLockRef.current = false;
      return;
    }

    clearCountdownTimer();
    setFlashColor(null);
    setCountdown(3);
    setStage('countdown');

    let remaining = 3;
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        clearCountdownTimer();
        setCountdown(null);
        void executeRecordingSequence(stream);
      }
    }, 1000);
  }, [clearCountdownTimer, executeRecordingSequence, handoffToken, sessionInfo, startCamera]);

  // Auto-detecção do rosto enquanto aguarda na tela inicial com a câmera aberta
  useEffect(() => {
    if (stage !== 'ready' || !cameraActive || sequenceLockRef.current) {
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
          void triggerCountdownAndCapture();
        }
      } finally {
        inFlight = false;
      }
    }, 950);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [biometricsBaseUrl, cameraActive, stage, triggerCountdownAndCapture]);

  // ============================================================================
  // TELA CHEIA LIMPA (CONTAGEM REGRESSIVA 3s + FLASHES DE COR FORTES — SÓ O ROSTO!)
  // ============================================================================
  if (stage === 'countdown' || stage === 'recording') {
    const isColorFlash = stage === 'recording' && flashColor !== null && flashColor !== '#000000';
    const activeBg = flashColor || '#050811';
    const ovalBorderColor = stage === 'countdown' ? '#10B981' : isColorFlash ? activeBg : '#FFFFFF';

    return (
      <div
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

          {/* Emissão extra de cor pura sobre o oval durante o flash para maximizar luminosidade no rosto */}
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

          {stage === 'countdown' && countdown !== null && (
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

  // ============================================================================
  // TELA DE PROCESSAMENTO LIMPA
  // ============================================================================
  if (stage === 'processing') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          backgroundColor: '#0B0F19',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          gap: '16px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#10B981',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
          {isAlreadyEnrolled ? 'Reconhecendo seu rosto...' : 'Cadastrando sua biometria...'}
        </h1>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FAF7F5',
        color: '#1F1A1C',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '22px 18px',
          boxShadow: '0 10px 30px rgba(90, 8, 29, 0.08)',
          border: '1px solid #EAE2DF',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.45rem', lineHeight: 1.25, color: '#2B0A12' }}>
          {stage === 'approved'
            ? 'Verificação concluída!'
            : sessionInfo
              ? `Olá, ${sessionInfo.firstName}!`
              : 'Verificação Facial'}
        </h1>

        {stage !== 'approved' && stage !== 'expired' && (
          <div
            onClick={() => {
              if (stage === 'ready' || stage === 'error') {
                void triggerCountdownAndCapture();
              }
            }}
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              maxHeight: '360px',
              borderRadius: '18px',
              overflow: 'hidden',
              backgroundColor: '#111827',
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
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.30)',
              }}
            />

            {!cameraActive && (
              <p
                style={{
                  position: 'relative',
                  zIndex: 2,
                  color: '#FFFFFF',
                  padding: '20px',
                  fontSize: '1.05rem',
                  lineHeight: 1.45,
                  margin: 0,
                  maxWidth: '260px',
                }}
              >
                Toque em <strong>Começar</strong> abaixo para abrir sua câmera frontal.
              </p>
            )}
          </div>
        )}

        {stage === 'approved' && (
          <div
            style={{
              padding: '22px 16px',
              borderRadius: '16px',
              backgroundColor: '#ECFDF5',
              border: '2px solid #059669',
              color: '#065F46',
              fontSize: '1.08rem',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {stage !== 'approved' && (
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: stage === 'error' || stage === 'expired' ? '#FEF2F2' : '#F3F4F6',
              color: stage === 'error' || stage === 'expired' ? '#991B1B' : '#1F2937',
              fontSize: '0.98rem',
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
        )}

        {(stage === 'ready' || stage === 'error') && (
          <button
            type="button"
            onClick={() => void triggerCountdownAndCapture()}
            style={{
              width: '100%',
              minHeight: '56px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#5A081D',
              color: '#FFFFFF',
              fontSize: '1.12rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '12px 20px',
            }}
          >
            {stage === 'error' ? 'Tentar novamente' : 'Começar'}
          </button>
        )}
      </main>
    </div>
  );
}
