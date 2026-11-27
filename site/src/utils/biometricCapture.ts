/**
 * Utilitários compartilhados de captura biométrica facial no navegador (RF-11).
 * SEC-CRIT-01: O navegador NUNCA envia vídeo diretamente para /biometrics/register ou /verify.
 * Toda submissão biométrica passa pelo backend Spring Boot autenticado (via token QR ou Bearer JWT),
 * que extrai o userId confiável no servidor e se comunica com o Python usando X-Internal-Api-Key.
 */

import { fetchWithSessionRefresh, type VerifyBiometricsResponse } from '../services/apiClient';
import type { AuthSession } from '../types/auth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface ChallengePayload {
  session_token: string;
  colors: string[];
  flash_duration_ms: number;
}

export interface RecordedLivenessPayload {
  videoBlob: Blob;
  filename: string;
  expectedColors: string;
  sessionToken: string;
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
 * Consulta via backend Java se o titular da sessão QR já possui biometria facial cadastrada.
 */
export async function checkHandoffEnrollmentStatus(handoffToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/biometrics/handoff/${encodeURIComponent(handoffToken)}/enrollment-status`
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

/**
 * Solicita o desafio de cores (/biometrics/challenge) e grava o vídeo de prova de vida.
 */
export async function recordLivenessVideo(params: {
  stream: MediaStream;
  biometricsBaseUrl: string;
  onStatus: (message: string) => void;
  onFlashColor: (hex: string | null) => void;
}): Promise<RecordedLivenessPayload> {
  const { stream, biometricsBaseUrl, onStatus, onFlashColor } = params;

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
  const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 650_000 };
  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }
  const recorder = new MediaRecorder(stream, recorderOptions);

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

  // Flashes suaves e lentos (~1050ms por cor) para captar o reflexo real na pele
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

  return {
    videoBlob,
    filename,
    expectedColors: challenge.colors.join(','),
    sessionToken: challenge.session_token,
  };
}

async function parseSubmitResponse(response: Response): Promise<VerifyBiometricsResponse> {
  const data = (await response.json().catch(() => ({}))) as Partial<VerifyBiometricsResponse> & {
    detail?: string;
    reason?: string;
    error?: string;
    title?: string;
  };

  if (response.status === 429) {
    throw new Error('Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.');
  }
  if (!response.ok || !data.verifiedBadge50plus) {
    throw new Error(
      data.detail ||
        data.reason ||
        data.error ||
        data.title ||
        'Não foi possível validar sua prova de vida. Fique de frente para a tela e tente novamente.'
    );
  }

  return data as VerifyBiometricsResponse;
}

/**
 * SEC-CRIT-01 — Submete o vídeo do fluxo QR diretamente ao backend Spring Boot autenticado pelo handoffToken.
 */
export async function submitHandoffLivenessVideo(
  handoffToken: string,
  recorded: RecordedLivenessPayload
): Promise<VerifyBiometricsResponse> {
  const form = new FormData();
  form.append('expected_colors', recorded.expectedColors);
  form.append('session_token', recorded.sessionToken);
  form.append('video', recorded.videoBlob, recorded.filename);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/biometrics/handoff/${encodeURIComponent(handoffToken)}/submit-video`,
    {
      method: 'POST',
      body: form,
    }
  );
  return parseSubmitResponse(response);
}

/**
 * SEC-CRIT-01 — Submete o vídeo do fluxo direto no celular ao backend Spring Boot autenticado via Bearer JWT.
 */
export async function submitAuthedLivenessVideo(
  session: AuthSession,
  recorded: RecordedLivenessPayload
): Promise<VerifyBiometricsResponse> {
  const form = new FormData();
  form.append('expected_colors', recorded.expectedColors);
  form.append('session_token', recorded.sessionToken);
  form.append('video', recorded.videoBlob, recorded.filename);

  const response = await fetchWithSessionRefresh(
    session,
    '/api/v1/profiles/me/biometrics/submit-video',
    (token) => ({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  );
  return parseSubmitResponse(response);
}
