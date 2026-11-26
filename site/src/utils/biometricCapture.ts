/**
 * Utilitários compartilhados de captura biométrica facial no navegador (RF-11).
 * Compatível com Android Chrome (video/webm) e iPhone Safari (video/mp4).
 */

export interface ChallengePayload {
  session_token: string;
  colors: string[];
  flash_duration_ms: number;
}

export interface BiometricsServiceResponse {
  success?: boolean;
  verified?: boolean;
  is_live?: boolean;
  jwt_token?: string | null;
  reason?: string;
  status?: string;
  error?: string;
  detail?: string;
}

export const BIOMETRIC_COLOR_HEX: Record<string, string> = {
  VERMELHO: '#FF0000',
  AZUL: '#0000FF',
  VERDE: '#00FF00',
};

export function resolveBiometricsBaseUrl(): string {
  const configured = import.meta.env.VITE_BIOMETRIA_API_URL as string | undefined;
  return configured && configured.trim().length > 0
    ? configured.trim().replace(/\/+$/, '')
    : '/biometrics';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return uaMobile || (coarsePointer && window.innerWidth <= 900);
}

export function pickSupportedVideoFormat(): { mimeType: string; filename: string } {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return { mimeType: '', filename: 'liveness.mp4' };
  }

  const candidates: Array<{ mimeType: string; filename: string }> = [
    { mimeType: 'video/mp4;codecs=avc1', filename: 'liveness.mp4' },
    { mimeType: 'video/mp4', filename: 'liveness.mp4' },
    { mimeType: 'video/webm;codecs=vp8', filename: 'liveness.webm' },
    { mimeType: 'video/webm;codecs=vp9', filename: 'liveness.webm' },
    { mimeType: 'video/webm', filename: 'liveness.webm' },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: '', filename: 'liveness.webm' };
}

export const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function recordAndSubmitLiveness(params: {
  stream: MediaStream;
  biometricsBaseUrl: string;
  userId: string;
  firstName: string;
  onStatus: (message: string) => void;
  onFlashColor: (hex: string | null) => void;
}): Promise<string> {
  const { stream, biometricsBaseUrl, userId, firstName, onStatus, onFlashColor } = params;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error(
      'Este navegador não suporta gravação de vídeo para prova de vida. Tente abrir no Chrome ou Safari atualizado.'
    );
  }

  onStatus('Preparando desafio de prova de vida...');
  const chRes = await fetch(`${biometricsBaseUrl}/challenge`);
  if (!chRes.ok) {
    throw new Error(`Serviço de biometria indisponível no momento (HTTP ${chRes.status}).`);
  }
  const challenge = (await chRes.json()) as ChallengePayload;

  const { mimeType, filename } = pickSupportedVideoFormat();
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

  onStatus('Olhe para a câmera e não se mexa enquanto as cores piscam...');
  recorder.start();
  await sleepMs(250);
  onFlashColor('#000000');
  await sleepMs(300);

  for (const color of challenge.colors) {
    onFlashColor(BIOMETRIC_COLOR_HEX[color] || '#FFFFFF');
    await sleepMs(challenge.flash_duration_ms || 500);
  }

  onFlashColor('#000000');
  await sleepMs(350);
  recorder.stop();
  onFlashColor(null);

  const videoBlob = await recordingDone;
  if (videoBlob.size === 0) {
    throw new Error('Não foi possível capturar o vídeo da câmera. Tente novamente.');
  }

  onStatus('Validando prova de vida (MiniFASNet V2) e identidade facial...');
  const form = new FormData();
  form.append('expected_colors', challenge.colors.join(','));
  form.append('session_token', challenge.session_token);
  form.append('user_id', userId);
  form.append('name', firstName.trim() || 'Usuário');
  form.append('video', videoBlob, filename);

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
      bioData.reason ||
        bioData.detail ||
        bioData.error ||
        'Prova de vida não aprovada. Fique de frente em um local bem iluminado e tente novamente.'
    );
  }

  return bioData.jwt_token;
}
