import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, Rect, Mask, Ellipse } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Dimensões do recorte oval
const MASK_WIDTH = width * 0.78;
const MASK_HEIGHT = MASK_WIDTH * 1.35;
const MASK_X = width / 2;
const MASK_Y = height / 2.5;

// IP do backend Docker na rede local
const API_URL = 'http://192.168.1.44:8000';

type VerifyResponse = {
  status: string;
  face_detected: boolean;
  similarity_score?: number;
  face_match_threshold?: number;
  face_match?: boolean;
  liveness: {
    available: boolean;
    score?: number;
    threshold?: number;
    passed?: boolean;
  };
};

const CHALLENGES = [
  { id: 'near', text: '🔍 Aproxime o celular do rosto', sub: 'Mova o aparelho devagar em direção ao seu rosto' },
  { id: 'smile', text: '😊 Dê um sorriso para a câmera', sub: 'Mantenha a expressão natural' },
  { id: 'blink', text: '👁️ Pisque os olhos lentamente', sub: 'Confirmação de vivacidade' },
];

export default function FaceCaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Estados do fluxo
  const [stage, setStage] = useState<'step1_intro' | 'step1_counting' | 'step2_intro' | 'step2_active' | 'analyzing' | 'result'>('step1_intro');
  const [countdown, setCountdown] = useState(3);
  const [selectedChallenge, setSelectedChallenge] = useState(CHALLENGES[0]);
  const [flashActive, setFlashActive] = useState(false);

  const [referencePhotoUri, setReferencePhotoUri] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<VerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  // Início automático do Passo 1
  useEffect(() => {
    if (stage === 'step1_intro') {
      const timer = setTimeout(() => {
        setCountdown(3);
        setStage('step1_counting');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Contagem regressiva do Passo 1
  useEffect(() => {
    if (stage !== 'step1_counting') return;

    if (countdown <= 0) {
      captureReference();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [stage, countdown]);

  // Início do Passo 2 (Desafio Ativo de Vivacidade)
  useEffect(() => {
    if (stage === 'step2_intro') {
      // Sortear um desafio aleatório
      const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setSelectedChallenge(randomChallenge);

      const timer = setTimeout(() => {
        setCountdown(3);
        setStage('step2_active');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Contagem do Passo 2 + Disparo do Flash Anti-Display
  useEffect(() => {
    if (stage !== 'step2_active') return;

    if (countdown <= 0) {
      // Dispara flash branco na tela por 300ms antes da captura para gerar reflexo natural
      setFlashActive(true);
      setTimeout(() => {
        captureSelfie();
        setFlashActive(false);
      }, 300);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const captureReference = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        setReferencePhotoUri(photo.uri);
        setStage('step2_intro');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro ao capturar foto base.');
      setStage('result');
    }
  };

  const captureSelfie = async () => {
    if (!cameraRef.current || !referencePhotoUri) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        sendForVerification(referencePhotoUri, photo.uri);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro ao capturar selfie biométrica.');
      setStage('result');
    }
  };

  const sendForVerification = async (refUri: string, selfieUri: string) => {
    setStage('analyzing');
    setErrorMessage(null);

    try {
      const formData = new FormData();

      formData.append('reference_image', {
        uri: refUri,
        name: 'ref.jpg',
        type: 'image/jpeg',
      } as any);

      formData.append('selfie_image', {
        uri: selfieUri,
        name: 'selfie.jpg',
        type: 'image/jpeg',
      } as any);

      formData.append('same_person_expected', 'true');

      const response = await fetch(`${API_URL}/api/verify`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      const data: VerifyResponse = await response.json();
      setApiResult(data);
      setStage('result');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha de comunicação com o servidor de IA.');
      setStage('result');
    }
  };

  const restart = () => {
    setReferencePhotoUri(null);
    setApiResult(null);
    setErrorMessage(null);
    setCountdown(3);
    setStage('step1_intro');
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Acesso à câmera necessário para biometria.</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stage !== 'result' && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="picture"
        />
      )}

      {/* Máscara Oval com SVG */}
      {stage !== 'result' && (
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="mask">
              <Rect height="100%" width="100%" fill="white" />
              <Ellipse cx={MASK_X} cy={MASK_Y} rx={MASK_WIDTH / 2} ry={MASK_HEIGHT / 2} fill="black" />
            </Mask>
          </Defs>
          <Rect
            height="100%"
            width="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#mask)"
          />
          <Ellipse
            cx={MASK_X}
            cy={MASK_Y}
            rx={MASK_WIDTH / 2}
            ry={MASK_HEIGHT / 2}
            fill="none"
            stroke={stage === 'step2_active' ? '#00E676' : '#FFFFFF'}
            strokeWidth={3.5}
          />
        </Svg>
      )}

      {/* Flash Branco Anti-Display (Reflexo de Luz) */}
      {flashActive && <View style={styles.flashOverlay} />}

      {/* Camada de Feedbacks Interativos */}
      <View style={styles.topContainer}>
        {/* PASSO 1: FOTO BASE */}
        {stage === 'step1_intro' && (
          <View style={styles.cardInfo}>
            <Text style={styles.badgeStep}>ETAPA 1/2: FOTO CADASTRO</Text>
            <Text style={styles.mainTitle}>Enquadre seu Rosto</Text>
            <Text style={styles.subTitle}>Mantenha-se centralizado no círculo</Text>
          </View>
        )}

        {stage === 'step1_counting' && (
          <View style={styles.cardInfo}>
            <Text style={styles.badgeStep}>ETAPA 1/2: CAPTURANDO</Text>
            <Text style={styles.timerNumber}>{countdown > 0 ? countdown : '📸'}</Text>
            <Text style={styles.subTitle}>Fique parado...</Text>
          </View>
        )}

        {/* PASSO 2: PROVA DE VIDA ATIVA */}
        {stage === 'step2_intro' && (
          <View style={[styles.cardInfo, { borderColor: '#FF9100' }]}>
            <Text style={[styles.badgeStep, { backgroundColor: '#FF9100' }]}>ETAPA 2/2: PROVA DE VIDA</Text>
            <Text style={styles.mainTitle}>{selectedChallenge.text}</Text>
            <Text style={styles.subTitle}>{selectedChallenge.sub}</Text>
          </View>
        )}

        {stage === 'step2_active' && (
          <View style={[styles.cardInfo, { borderColor: '#00E676' }]}>
            <Text style={[styles.badgeStep, { backgroundColor: '#00E676' }]}>DESAFIO ATIVO</Text>
            <Text style={styles.timerNumber}>{countdown > 0 ? countdown : '📸'}</Text>
            <Text style={styles.subTitle}>{selectedChallenge.text}</Text>
          </View>
        )}

        {/* ANÁLISE DE SEGURANÇA NO DOCKER */}
        {stage === 'analyzing' && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color="#00E676" />
            <Text style={styles.analyzingTitle}>Analisando Biometria & Anti-Spoofing</Text>
            <Text style={styles.analyzingDesc}>
              Processando rede neural MiniFASNet e cálculo vetorial SFace...
            </Text>
          </View>
        )}

        {/* CARD FINAL DE RESULTADOS */}
        {stage === 'result' && (
          <View style={styles.finalCard}>
            {errorMessage ? (
              <>
                <Text style={styles.finalIcon}>⚠️</Text>
                <Text style={styles.titleError}>Erro na Verificação</Text>
                <Text style={styles.descText}>{errorMessage}</Text>
              </>
            ) : apiResult ? (
              <>
                <Text style={styles.finalIcon}>
                  {apiResult.status === 'VERIFIED'
                    ? '🛡️✅'
                    : apiResult.status === 'LIVENESS_FAILED'
                    ? '🚫🤖'
                    : '❌👤'}
                </Text>

                <Text
                  style={
                    apiResult.status === 'VERIFIED'
                      ? styles.titleSuccess
                      : styles.titleError
                  }
                >
                  {apiResult.status === 'VERIFIED'
                    ? 'Aprovado: Pessoa Real & Mesma Face!'
                    : apiResult.status === 'LIVENESS_FAILED'
                    ? 'Reprovado: Ataque Anti-Spoofing Detectado!'
                    : 'Reprovado: Rostos Diferentes!'}
                </Text>

                {/* Tabela de Métricas do Backend */}
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Anti-Spoofing (MiniFASNet):</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          apiResult.liveness?.passed
                            ? '#00E676'
                            : '#FF5252',
                      },
                    ]}
                  >
                    {apiResult.liveness?.available
                      ? `${( (apiResult.liveness?.score ?? 0) * 100).toFixed(1)}% (${apiResult.liveness?.passed ? 'VIVO' : 'SPOOF'})`
                      : 'Não disponível'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Similaridade 1:1 (SFace):</Text>
                  <Text style={styles.metricValue}>
                    {apiResult.similarity_score !== undefined
                      ? `${(apiResult.similarity_score * 100).toFixed(1)}%`
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Rosto Detectado:</Text>
                  <Text style={styles.metricValue}>
                    {apiResult.face_detected ? 'Sim (YuNet)' : 'Não'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Status Geral:</Text>
                  <Text style={[styles.metricValue, { fontWeight: '900' }]}>
                    {apiResult.status}
                  </Text>
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.btnRestart} onPress={restart}>
              <Text style={styles.btnRestartText}>🔄 Realizar Novo Teste</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
    zIndex: 999,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  topContainer: {
    position: 'absolute',
    top: height * 0.08,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardInfo: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.85)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeStep: {
    backgroundColor: '#1E88E5',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  mainTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subTitle: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  timerNumber: {
    color: '#00E676',
    fontSize: 52,
    fontWeight: '900',
  },
  analyzingCard: {
    marginTop: height * 0.28,
    backgroundColor: 'rgba(20,20,20,0.92)',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00E676',
  },
  analyzingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  analyzingDesc: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
  },
  finalCard: {
    marginTop: height * 0.12,
    backgroundColor: '#181818',
    width: width * 0.9,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333',
    elevation: 10,
  },
  finalIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  titleSuccess: {
    color: '#00E676',
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  titleError: {
    color: '#FF5252',
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  descText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  metricLabel: {
    color: '#888',
    fontSize: 14,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnPrimary: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnRestart: {
    backgroundColor: '#2A2A2A',
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  btnRestartText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
