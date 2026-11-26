import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  completeBiometricHandoff,
  fetchPublicBiometricHandoff,
  type BiometricHandoffSessionInfoResponse,
} from '../../services/apiClient';
import {
  recordAndSubmitLiveness,
  resolveBiometricsBaseUrl,
} from '../../utils/biometricCapture';

type HandoffPageStage = 'loading' | 'ready' | 'recording' | 'processing' | 'approved' | 'expired' | 'error';

/**
 * RF-11 — Página móvel dedicada para verificação facial via QR Code (sem precisar instalar app).
 * Aberta no navegador do celular através da URL `/verificar-rosto?t=<handoffToken>`.
 *
 * UX Defensiva 50+ (RF-06): textos grandes e claros, botões >= 52px, guia oval de posicionamento,
 * sem exigir login duplicado no celular (autorização por token efêmero de 5 min e uso único).
 */
export function MobileFacialHandoffPage() {
  const handoffToken = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('t')?.trim() || '';
  }, []);

  const biometricsBaseUrl = useMemo(() => resolveBiometricsBaseUrl(), []);

  const [stage, setStage] = useState<HandoffPageStage>('loading');
  const [sessionInfo, setSessionInfo] = useState<BiometricHandoffSessionInfoResponse | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Carregando sua sessão segura de verificação...');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (!handoffToken) {
      setStage('expired');
      setMessage('Código QR inválido ou incompleto. Escaneie novamente o código na tela do computador.');
      return;
    }

    let cancelled = false;
    fetchPublicBiometricHandoff(handoffToken)
      .then((info) => {
        if (cancelled) return;
        setSessionInfo(info);
        setStage('ready');
        setMessage('Posicione seu rosto dentro do contorno oval em um local bem iluminado.');
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
  }, [handoffToken]);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStage('error');
      setMessage(
        'Não foi possível abrir a câmera neste navegador. Verifique se você abriu o link por HTTPS no Chrome ou Safari.'
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
      setStage('error');
      setMessage(
        'Permissão da câmera negada. Toque no ícone de cadeado na barra de endereço, permita a câmera e tente novamente.'
      );
      return null;
    }
  }, []);

  const handleStartVerification = useCallback(async () => {
    if (!sessionInfo || !handoffToken) return;

    const stream = await startCamera();
    if (!stream) return;

    setStage('recording');
    try {
      const biometricJwt = await recordAndSubmitLiveness({
        stream,
        biometricsBaseUrl,
        userId: sessionInfo.userId,
        firstName: sessionInfo.firstName,
        onStatus: (statusMsg) => {
          setMessage(statusMsg);
          if (statusMsg.includes('Validando')) {
            setStage('processing');
          }
        },
        onFlashColor: setFlashColor,
      });

      setStage('processing');
      setMessage('Ativando seu Selo de Verificado 50+...');
      await completeBiometricHandoff(handoffToken, biometricJwt);

      stopCamera();
      setStage('approved');
      setMessage(
        'Tudo certo! Seu perfil foi verificado com sucesso. Você já pode fechar esta tela e voltar para o computador.'
      );
    } catch (err) {
      setFlashColor(null);
      setStage('error');
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a verificação. Tente novamente em um local bem iluminado.';
      setMessage(errMsg);
    }
  }, [biometricsBaseUrl, handoffToken, sessionInfo, startCamera, stopCamera]);

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
      {flashColor && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: flashColor,
            opacity: 0.88,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}

      <main
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px 20px',
          boxShadow: '0 10px 30px rgba(90, 8, 29, 0.08)',
          border: '1px solid #EAE2DF',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            alignSelf: 'center',
            backgroundColor: '#FDF1F4',
            color: '#5A081D',
            padding: '8px 14px',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <span>🛡️ Selo de Verificado 50+</span>
        </div>

        <h1 style={{ margin: 0, fontSize: '1.55rem', lineHeight: 1.25, color: '#2B0A12' }}>
          {stage === 'approved'
            ? 'Verificação concluída!'
            : sessionInfo
              ? `Olá, ${sessionInfo.firstName}!`
              : 'Verificação Facial BeyondTime'}
        </h1>

        {stage !== 'approved' && stage !== 'expired' && (
          <div
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              maxHeight: '380px',
              borderRadius: '18px',
              overflow: 'hidden',
              backgroundColor: '#111827',
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

            {/* Guia oval de posicionamento facial */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: '68%',
                height: '76%',
                borderRadius: '50%',
                border: '3px dashed rgba(255,255,255,0.85)',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.28)',
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
                  maxWidth: '280px',
                }}
              >
                Toque no botão abaixo para abrir sua câmera frontal. A tela vai piscar 3 cores por 3 segundos.
              </p>
            )}
          </div>
        )}

        {stage === 'approved' && (
          <div
            style={{
              padding: '24px 16px',
              borderRadius: '16px',
              backgroundColor: '#ECFDF5',
              border: '2px solid #059669',
              color: '#065F46',
              fontSize: '1.1rem',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }} aria-hidden="true">
              ✅
            </div>
            {message}
          </div>
        )}

        {stage !== 'approved' && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: stage === 'error' || stage === 'expired' ? '#FEF2F2' : '#F3F4F6',
              color: stage === 'error' || stage === 'expired' ? '#991B1B' : '#1F2937',
              fontSize: '1rem',
              lineHeight: 1.45,
            }}
          >
            {message}
          </div>
        )}

        {(stage === 'ready' || stage === 'error') && (
          <button
            type="button"
            onClick={handleStartVerification}
            style={{
              width: '100%',
              minHeight: '56px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#5A081D',
              color: '#FFFFFF',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '12px 20px',
            }}
          >
            {stage === 'error' ? 'Tentar novamente' : 'Iniciar verificação facial'}
          </button>
        )}

        {(stage === 'recording' || stage === 'processing') && (
          <button
            type="button"
            disabled
            style={{
              width: '100%',
              minHeight: '56px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#9CA3AF',
              color: '#FFFFFF',
              fontSize: '1.05rem',
              fontWeight: 700,
              padding: '12px 20px',
            }}
          >
            {stage === 'recording' ? 'Gravando prova de vida...' : 'Confirmando identidade...'}
          </button>
        )}

        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.4 }}>
          Esta captura serve apenas para confirmar que você é real e nunca é publicada no seu perfil (LGPD).
        </p>
      </main>
    </div>
  );
}
