/**
 * RF11 — Validação Facial com Prova de Vida e Selo de Verificado 50+
 *
 * Cliente do microsserviço `reconhecimento-facial` (FastAPI + YuNet + SFace + MiniFASNetV2):
 *   1. GET  /challenge  → recebe cores aleatórias + session_token (expira em 2 min)
 *   2. Grava vídeo curto pela câmera frontal enquanto a tela pisca as cores
 *      (o servidor confere o reflexo ΔRGB na pele → bloqueia fotos/telas/máscaras)
 *   3. POST /register   → cadastra o rosto de referência do usuário (1ª vez)
 *      POST /verify     → compara 1:1 com o rosto cadastrado e devolve jwt_token
 *
 * UX Defensiva 50+ (RF06): botões ≥ 48dp, botão "Voltar" visível,
 * ícones sempre com rótulo em texto e nenhum gesto complexo.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_BIOMETRIA_API_URL || 'http://10.0.2.2:8000';
const REQUEST_TIMEOUT_MS = 30000;

const COLOR_MAP: Record<string, string> = {
  VERMELHO: '#FF0000',
  AZUL: '#0000FF',
  VERDE: '#00FF00',
};

type Mode = 'REGISTER' | 'VERIFY';
type Stage = 'START' | 'CAMERA' | 'RECORDING' | 'PROCESSING' | 'RESULT';

interface ChallengeResponse {
  session_token: string;
  colors: string[];
  flash_duration_ms: number;
}

interface BiometriaResult {
  success?: boolean; // /register
  verified?: boolean; // /verify
  is_live?: boolean;
  distance?: number;
  threshold?: number;
  jwt_token?: string | null;
  reason?: string;
  status?: string;
  error?: string;
  detail?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function FaceCaptureScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<Mode>('VERIFY');
  // Temporário até a integração com o backend Java (RF01): o id virá do JWT da sessão.
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');

  const [stage, setStage] = useState<Stage>('START');
  const [cameraReady, setCameraReady] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<BiometriaResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseUrl = serverUrl.trim().replace(/\/$/, '');
  const permissionsGranted = !!cameraPermission?.granted && !!micPermission?.granted;

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted) requestCameraPermission();
    if (micPermission && !micPermission.granted) requestMicPermission();
  }, [cameraPermission, micPermission]);

  const canStart =
    userId.trim().length > 0 && (mode === 'VERIFY' || firstName.trim().length > 0);

  const goBack = () => {
    setStage('START');
    setFlashColor(null);
    setResult(null);
    setErrorMessage(null);
    setCameraReady(false);
  };

  const fail = (msg: string) => {
    setFlashColor(null);
    setErrorMessage(msg);
    setStage('RESULT');
  };

  const runLiveness = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setStage('RECORDING');
    setErrorMessage(null);
    setResult(null);

    try {
      // 1. Desafio dinâmico (cores + token de sessão)
      setStatusMessage('Preparando o teste...');
      const chRes = await fetchWithTimeout(`${baseUrl}/challenge`);
      if (!chRes.ok) throw new Error(`Servidor respondeu HTTP ${chRes.status} no desafio.`);
      const challenge: ChallengeResponse = await chRes.json();

      // 2. Grava o vídeo enquanto a tela pisca as cores do desafio
      setStatusMessage('Olhe para a tela e não se mexa');
      const recordPromise = cameraRef.current.recordAsync({ maxDuration: 5 });
      await sleep(200);
      setFlashColor('#000000');
      await sleep(300);
      for (const color of challenge.colors) {
        setFlashColor(COLOR_MAP[color] || '#FFFFFF');
        await sleep(challenge.flash_duration_ms || 500);
      }
      setFlashColor('#000000');
      await sleep(400);
      cameraRef.current?.stopRecording();
      const video = await recordPromise;
      setFlashColor(null);
      await sleep(400); // tempo para o SO finalizar a escrita do MP4

      if (!video?.uri) throw new Error('A câmera não conseguiu gravar o vídeo.');

      // 3. Envia para cadastro ou verificação
      setStage('PROCESSING');
      setStatusMessage(mode === 'REGISTER' ? 'Cadastrando seu rosto...' : 'Conferindo sua identidade...');

      const form = new FormData();
      form.append('expected_colors', challenge.colors.join(','));
      form.append('session_token', challenge.session_token);
      form.append('user_id', userId.trim());
      if (mode === 'REGISTER') form.append('name', firstName.trim());
      form.append('video', {
        uri: video.uri.startsWith('file://') ? video.uri : `file://${video.uri}`,
        name: 'liveness.mp4',
        type: 'video/mp4',
      } as any);

      const endpoint = mode === 'REGISTER' ? '/register' : '/verify';
      const res = await fetchWithTimeout(`${baseUrl}${endpoint}`, { method: 'POST', body: form });
      const data: BiometriaResult = await res.json().catch(() => ({}));

      if (res.status === 429) {
        throw new Error('Muitas tentativas seguidas. Aguarde 1 minuto e tente de novo.');
      }
      if (!res.ok) {
        throw new Error(data.detail || `Servidor respondeu HTTP ${res.status}.`);
      }

      setResult(data);
      setStage('RESULT');
    } catch (err: any) {
      const raw = err?.message || '';
      const msg =
        err?.name === 'AbortError' || raw.includes('Network request failed')
          ? `Não foi possível falar com o servidor (${baseUrl}). Confira o endereço em "Configurar servidor".`
          : raw || 'Falha inesperada no teste.';
      fail(msg);
    }
  };

  const testConnection = async () => {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/health`);
      const data = await res.json();
      setErrorMessage(null);
      setStatusMessage(
        res.ok
          ? `Conectado ✅ (versão ${data.version ?? '?'}, anti-spoofing: ${data.anti_spoofing ?? '?'})`
          : `Servidor respondeu HTTP ${res.status}`,
      );
    } catch {
      setStatusMessage(`Sem conexão com ${baseUrl} ❌`);
    }
  };

  // ---------------------------------------------------------------- Permissões
  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Precisamos da sua câmera</Text>
        <Text style={styles.text}>
          A câmera grava um vídeo de 3 segundos para confirmar que é você mesmo. O vídeo não fica salvo no
          celular.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
        >
          <Text style={styles.primaryButtonText}>📷 Permitir câmera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------- Início
  if (stage === 'START') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Selo de Verificado 50+</Text>
          <Text style={styles.text}>
            Vamos confirmar que o perfil é seu. A tela vai piscar algumas cores enquanto a câmera grava o seu
            rosto por poucos segundos.
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'REGISTER' && styles.modeButtonActive]}
              onPress={() => setMode('REGISTER')}
            >
              <Text style={styles.modeButtonText}>📝 Cadastrar meu rosto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'VERIFY' && styles.modeButtonActive]}
              onPress={() => setMode('VERIFY')}
            >
              <Text style={styles.modeButtonText}>✅ Verificar identidade</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Identificador do usuário</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Ex.: id do perfil no BeyondTime"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />

          {mode === 'REGISTER' && (
            <>
              <Text style={styles.label}>Primeiro nome</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ex.: Maria"
                placeholderTextColor="#64748B"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !canStart && styles.buttonDisabled]}
            disabled={!canStart}
            onPress={() => setStage('CAMERA')}
          >
            <Text style={styles.primaryButtonText}>▶️ Começar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowSettings((v) => !v)}>
            <Text style={styles.secondaryButtonText}>⚙️ Configurar servidor</Text>
          </TouchableOpacity>

          {showSettings && (
            <View style={styles.card}>
              <Text style={styles.label}>Endereço do serviço de reconhecimento facial</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://192.168.0.10:8000"
                placeholderTextColor="#64748B"
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={testConnection}>
                <Text style={styles.secondaryButtonText}>🔌 Testar conexão</Text>
              </TouchableOpacity>
              {!!statusMessage && <Text style={styles.text}>{statusMessage}</Text>}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------- Resultado
  if (stage === 'RESULT') {
    const approved = !errorMessage && (mode === 'REGISTER' ? !!result?.success : !!result?.verified);
    const reason = errorMessage || result?.reason || result?.error || result?.status;

    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: approved ? '#10B981' : '#F87171' }]}>
            {approved
              ? mode === 'REGISTER'
                ? '✅ Rosto cadastrado!'
                : '✅ Identidade confirmada!'
              : '❌ Não foi possível confirmar'}
          </Text>

          {!!reason && <Text style={styles.text}>{reason}</Text>}

          {result && !errorMessage && (
            <View style={styles.card}>
              <Text style={styles.detail}>Prova de vida: {result.is_live ? 'aprovada' : 'reprovada'}</Text>
              {typeof result.distance === 'number' && (
                <Text style={styles.detail}>
                  Distância facial: {result.distance} (limite {result.threshold})
                </Text>
              )}
              {mode === 'VERIFY' && (
                <Text style={styles.detail}>
                  Token biométrico: {result.jwt_token ? 'emitido ✅' : 'não emitido'}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={() => setStage('CAMERA')}>
            <Text style={styles.primaryButtonText}>🔄 Tentar de novo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goBack}>
            <Text style={styles.secondaryButtonText}>⬅️ Voltar ao início</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------- Câmera / gravação / processamento
  const busy = stage === 'RECORDING' || stage === 'PROCESSING';

  return (
    <SafeAreaView style={[styles.screen, flashColor ? { backgroundColor: flashColor } : null]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={goBack}
        >
          <Text style={styles.secondaryButtonText}>⬅️ Voltar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.cameraTitle}>
        {stage === 'CAMERA' ? 'Coloque o rosto dentro do círculo' : statusMessage}
      </Text>

      <View style={styles.ovalMask}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          mute
          videoQuality="480p"
          onCameraReady={() => setCameraReady(true)}
        />
      </View>

      {stage === 'PROCESSING' && <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 24 }} />}

      {stage === 'CAMERA' && (
        <TouchableOpacity
          style={[styles.primaryButton, !cameraReady && styles.buttonDisabled]}
          disabled={!cameraReady}
          onPress={runLiveness}
        >
          <Text style={styles.primaryButtonText}>
            {cameraReady ? '📸 Estou pronto' : 'Abrindo a câmera...'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  center: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  cameraTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  text: { color: '#CBD5E1', fontSize: 18, lineHeight: 26, marginBottom: 16, textAlign: 'center' },
  detail: { color: '#CBD5E1', fontSize: 16, marginBottom: 6 },
  label: { color: '#F8FAFC', fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#F8FAFC',
    fontSize: 18,
    backgroundColor: '#1E293B',
  },
  modeRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  modeButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  modeButtonActive: { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
  modeButtonText: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  primaryButton: {
    minHeight: 56,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: '#E2E8F0', fontSize: 18, fontWeight: '600' },
  backButton: {
    minHeight: 48,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonDisabled: { opacity: 0.45 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  ovalMask: {
    alignSelf: 'center',
    width: 280,
    height: 360,
    borderRadius: 180,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#38BDF8',
    backgroundColor: '#000',
  },
});
