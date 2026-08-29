import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, Rect, Mask, Ellipse } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Dimensões do recorte oval (estilo Mercado Pago)
const MASK_WIDTH = width * 0.75;
const MASK_HEIGHT = MASK_WIDTH * 1.3;
const MASK_X = width / 2;
const MASK_Y = height / 2.5;

// IP local da máquina onde o Docker da API está rodando
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

export default function FaceCaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Etapas: 
  // 'step1_ready' -> 'step1_countdown' -> 'step1_captured'
  // 'step2_ready' -> 'step2_countdown' -> 'step2_captured'
  // 'analyzing' -> 'result'
  const [step, setStep] = useState<'step1_ready' | 'step1_countdown' | 'step2_ready' | 'step2_countdown' | 'analyzing' | 'result'>('step1_ready');
  const [countdown, setCountdown] = useState(3);
  
  const [referencePhotoUri, setReferencePhotoUri] = useState<string | null>(null);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null);
  
  const [apiResult, setApiResult] = useState<VerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  // Iniciar contagem regressiva automaticamente quando entrar nas etapas prontas
  useEffect(() => {
    if (step === 'step1_ready' || step === 'step2_ready') {
      const timer = setTimeout(() => {
        setCountdown(3);
        setStep(step === 'step1_ready' ? 'step1_countdown' : 'step2_countdown');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Gerenciador do timer 3... 2... 1... 📸
  useEffect(() => {
    if (step !== 'step1_countdown' && step !== 'step2_countdown') return;

    if (countdown <= 0) {
      captureCurrentStep();
      return;
    }

    const interval = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(interval);
  }, [step, countdown]);

  const captureCurrentStep = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!photo?.uri) {
        setErrorMessage('Falha ao capturar imagem.');
        return;
      }

      if (step === 'step1_countdown') {
        // Foto 1 salva (Foto de Cadastro/Referência)
        setReferencePhotoUri(photo.uri);
        setStep('step2_ready');
      } else if (step === 'step2_countdown') {
        // Foto 2 salva (Selfie ao vivo)
        setSelfiePhotoUri(photo.uri);
        // Enviar ambas para a API Backend
        if (referencePhotoUri) {
          sendToBackend(referencePhotoUri, photo.uri);
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro na câmera. Tente novamente.');
    }
  };

  const sendToBackend = async (refUri: string, selfieUri: string) => {
    setStep('analyzing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      
      formData.append('reference_image', {
        uri: refUri,
        name: 'reference.jpg',
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
        throw new Error(`Erro na API (${response.status})`);
      }

      const data: VerifyResponse = await response.json();
      setApiResult(data);
      setStep('result');
    } catch (err: any) {
      console.error('Erro ao chamar API:', err);
      setErrorMessage(err.message || 'Não foi possível conectar à API de biometria.');
      setStep('result');
    }
  };

  const restartFlow = () => {
    setReferencePhotoUri(null);
    setSelfiePhotoUri(null);
    setApiResult(null);
    setErrorMessage(null);
    setCountdown(3);
    setStep('step1_ready');
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso à câmera para verificação facial.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step !== 'result' && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="picture"
        />
      )}

      {/* SVG Mask Oval */}
      {step !== 'result' && (
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
            fill="rgba(0,0,0,0.7)"
            mask="url(#mask)"
          />
          <Ellipse
            cx={MASK_X}
            cy={MASK_Y}
            rx={MASK_WIDTH / 2}
            ry={MASK_HEIGHT / 2}
            fill="none"
            stroke={
              (step === 'step1_countdown' || step === 'step2_countdown') && countdown <= 1
                ? '#00FF00'
                : '#FFFFFF'
            }
            strokeWidth={3}
          />
        </Svg>
      )}

      {/* Conteúdo e Feedbacks na tela */}
      <View style={styles.contentContainer}>
        {/* ETAPA 1 */}
        {step === 'step1_ready' && (
          <View style={styles.box}>
            <Text style={styles.stepBadge}>PASSO 1 DE 2: FOTO BASE</Text>
            <Text style={styles.titleText}>Centralize seu rosto</Text>
            <Text style={styles.subtitleText}>Esta será sua foto de cadastro</Text>
          </View>
        )}

        {step === 'step1_countdown' && (
          <View style={styles.box}>
            <Text style={styles.stepBadge}>PASSO 1: FOTO BASE</Text>
            <Text style={styles.countdownBig}>{countdown > 0 ? countdown : '📸'}</Text>
            <Text style={styles.subtitleText}>Fique imóvel...</Text>
          </View>
        )}

        {/* ETAPA 2 */}
        {step === 'step2_ready' && (
          <View style={styles.box}>
            <Text style={[styles.stepBadge, { backgroundColor: '#FF9800' }]}>PASSO 2 DE 2: VALIDAÇÃO</Text>
            <Text style={styles.titleText}>Agora a Selfie ao Vivo</Text>
            <Text style={styles.subtitleText}>Olhe para a câmera para confirmar</Text>
          </View>
        )}

        {step === 'step2_countdown' && (
          <View style={styles.box}>
            <Text style={[styles.stepBadge, { backgroundColor: '#FF9800' }]}>PASSO 2: VALIDAÇÃO</Text>
            <Text style={styles.countdownBig}>{countdown > 0 ? countdown : '📸'}</Text>
            <Text style={styles.subtitleText}>Validando biometria...</Text>
          </View>
        )}

        {/* PROCESSANDO NA IA */}
        {step === 'analyzing' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#00FF00" />
            <Text style={styles.analyzingText}>Processando Inteligência Artificial...</Text>
            <Text style={styles.analyzingSub}>Comparando vetores faciais no backend</Text>
          </View>
        )}

        {/* RESULTADO FINAL DA API */}
        {step === 'result' && (
          <View style={styles.resultCard}>
            {errorMessage ? (
              <>
                <Text style={styles.resultEmoji}>❌</Text>
                <Text style={styles.resultTitleError}>Erro de Conexão</Text>
                <Text style={styles.resultDescription}>{errorMessage}</Text>
              </>
            ) : apiResult ? (
              <>
                <Text style={styles.resultEmoji}>
                  {apiResult.face_match ? '✅' : '❌'}
                </Text>
                
                <Text style={apiResult.face_match ? styles.resultTitleSuccess : styles.resultTitleError}>
                  {apiResult.face_match ? 'Identidade Confirmada!' : 'Faces Diferentes!'}
                </Text>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Similaridade Facial:</Text>
                  <Text style={styles.metricValue}>
                    {apiResult.similarity_score !== undefined 
                      ? `${(apiResult.similarity_score * 100).toFixed(1)}%` 
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Prova de Vida (Liveness):</Text>
                  <Text style={[
                    styles.metricValue, 
                    { color: apiResult.liveness?.passed ? '#00FF00' : '#FFA500' }
                  ]}>
                    {apiResult.liveness?.passed ? 'Aprovado' : 'Não verificado'}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Rosto Detectado:</Text>
                  <Text style={styles.metricValue}>
                    {apiResult.face_detected ? 'Sim' : 'Não'}
                  </Text>
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.restartButton} onPress={restartFlow}>
              <Text style={styles.buttonText}>🔄 Fazer Novo Reconhecimento</Text>
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
  text: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  contentContainer: {
    position: 'absolute',
    top: height * 0.08,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  box: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stepBadge: {
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  countdownBig: {
    color: '#00FF00',
    fontSize: 54,
    fontWeight: 'bold',
  },
  centerBox: {
    marginTop: height * 0.3,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF00',
  },
  analyzingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  analyzingSub: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
  },
  resultCard: {
    marginTop: height * 0.15,
    backgroundColor: '#1E1E1E',
    width: width * 0.9,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 8,
  },
  resultEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  resultTitleSuccess: {
    color: '#00FF00',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultTitleError: {
    color: '#FF5252',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultDescription: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 15,
  },
  metricValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  restartButton: {
    backgroundColor: '#333',
    marginTop: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
