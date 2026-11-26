/**
 * Utilitários compartilhados de captura biométrica facial no navegador (RF-11).
 * - 1ª vez (não cadastrado): executa /register (cadastra âncora facial 128D + anti-spoofing MiniFASNet V2 + reflexo espectral).
 * - Próximas vezes (já cadastrado): executa /verify 1:1 (compara com o rosto cadastrado + anti-spoofing contra fotos/telas).
 * Compatível com Android Chrome/Brave (video/webm) e iPhone Safari (video/mp4).
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

export interface FaceAlignmentResult {
  detected: boolean;
  centered: boolean;
  message?: string;
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

/**
 * Consulta rapidamente se o usuário já possui rosto cadastrado no microsserviço biométrico.
 */
export async function checkBiometricEnrollmentStatus(
  userId: string,
  biometricsBaseUrl: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${biometricsBaseUrl}/enrollment-status/${encodeURIComponent(userId.trim())}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { enrolled?: boolean };
    return Boolean(data.enrolled);
  } catch {
    return false;
  }
}

/**
 * Captura um frame leve do <video> e verifica se há um rosto centralizado no oval (/detect_face).
 */
export async function checkFaceAlignment(
  videoEl: HTMLVideoElement | null,
  biometricsBaseUrl: string
): Promise<FaceAlignmentResult> {
  if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    return { detected: false, centered: false };
  }

  try {
    const targetWidth = 320;
    const scale = targetWidth / videoEl.videoWidth;
    const targetHeight = Math.max(1, Math.round(videoEl.videoHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { detected: false, centered: false };

    ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

    const res = await fetch(`${biometricsBaseUrl}/detect_face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: dataUrl }),
    });
    if (!res.ok) return { detected: false, centered: false };
    const payload = (await res.json()) as FaceAlignmentResult;
    return {
      detected: Boolean(payload.detected),
      centered: Boolean(payload.centered),
      message: payload.message,
    };
  } catch {
    return { detected: false, centered: false };
  }
}

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

  // 1. Verifica se é 1º cadastro facial (/register) ou reconhecimento 1:1 (/verify)
  const alreadyEnrolled = await checkBiometricEnrollmentStatus(userId, biometricsBaseUrl);

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

  // Baseline escuro inicial (~400ms) sincronizado com validar_reflexo_delta_rgb
  onFlashColor('#000000');
  recorder.start();
  await sleepMs(400);

  // Flashes mais suaves e lentos (~1050ms por cor) para captar o reflexo real na pele
  const flashDuration = Math.max(950, challenge.flash_duration_ms || 1050);
  for (const color of challenge.colors) {
    onFlashColor(BIOMETRIC_COLOR_HEX[color] || '#FFFFFF');
    await sleepMs(flashDuration);
  }

  onFlashColor('#000000');
  await sleepMs(250);
  recorder.stop();
  onFlashColor(null);

  const videoBlob = await recordingDone;
  if (videoBlob.size === 0) {
    throw new Error('Não foi possível capturar o vídeo da câmera. Tente novamente.');
  }

  onStatus(
    alreadyEnrolled
      ? 'Reconhecendo seu rosto e validando anti-golpe...'
      : 'Cadastrando seu rosto e validando prova de vida...'
  );

  const form = new FormData();
  form.append('expected_colors', challenge.colors.join(','));
  form.append('session_token', challenge.session_token);
  form.append('user_id', userId.trim());
  if (!alreadyEnrolled) {
    form.append('name', firstName.trim() || 'Usuário');
  }
  form.append('video', videoBlob, filename);

  const endpoint = alreadyEnrolled ? '/verify' : '/register';
  const bioRes = await fetch(`${biometricsBaseUrl}${endpoint}`, {
    method: 'POST',
    body: form,
  });
  const bioData = (await bioRes.json().catch(() => ({}))) as BiometricsServiceResponse;

  if (bioRes.status === 429) {
    throw new Error('Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.');
  }

  const isApproved = Boolean(bioData.success || bioData.verified) && Boolean(bioData.jwt_token);
  if (!bioRes.ok || !isApproved || !bioData.jwt_token) {
    throw new Error(
      bioData.reason ||
        bioData.detail ||
        bioData.error ||
        (alreadyEnrolled
          ? 'Rosto não reconhecido ou prova de vida reprovada. Apenas o titular da conta pode entrar.'
          : 'Prova de vida não aprovada. Fique de frente para a tela e tente novamente.')
    );
  }

  return bioData.jwt_token;
}
