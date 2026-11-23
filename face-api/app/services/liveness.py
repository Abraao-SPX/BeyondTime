import os
import cv2
import numpy as np
from typing import Tuple, Optional
from ..schemas import LivenessResult
from ..config import settings

class LivenessService:
    def __init__(self, model_path: str = "models/MiniFASNetV2.onnx"):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_model_path = os.path.join(base_dir, model_path)
        
        self.available = os.path.exists(full_model_path)
        if self.available:
            self.net = cv2.dnn.readNetFromONNX(full_model_path)
        else:
            self.net = None

    def _crop_face_with_scale(self, image: np.ndarray, face_box, scale: float = 2.7) -> np.ndarray:
        """
        Recorta a região da face com margem expandida (escala 2.7x) conforme
        especificação do modelo MiniFASNet.
        """
        img_h, img_w = image.shape[:2]
        x, y, w, h = int(face_box[0]), int(face_box[1]), int(face_box[2]), int(face_box[3])
        
        cx = x + w / 2.0
        cy = y + h / 2.0
        
        crop_size = int(max(w, h) * scale)
        
        x1 = int(cx - crop_size / 2.0)
        y1 = int(cy - crop_size / 2.0)
        x2 = x1 + crop_size
        y2 = y1 + crop_size
        
        # Calcular preenchimento (padding) caso o crop ultrapasse as bordas da imagem
        pad_top = max(0, -y1)
        pad_bottom = max(0, y2 - img_h)
        pad_left = max(0, -x1)
        pad_right = max(0, x2 - img_w)
        
        if pad_top > 0 or pad_bottom > 0 or pad_left > 0 or pad_right > 0:
            padded_img = cv2.copyMakeBorder(
                image, pad_top, pad_bottom, pad_left, pad_right,
                cv2.BORDER_CONSTANT, value=[0, 0, 0]
            )
            x1 += pad_left
            y1 += pad_top
            x2 += pad_left
            y2 += pad_top
            crop = padded_img[y1:y2, x1:x2]
        else:
            crop = image[y1:y2, x1:x2]
            
        return cv2.resize(crop, (80, 80))

    def check_liveness(self, image: np.ndarray, face_box) -> LivenessResult:
        """
        Avalia se a face na imagem é uma pessoa real viva (não foto impressa ou display).
        """
        if not self.available or self.net is None:
            return LivenessResult(
                available=False,
                score=None,
                threshold=settings.LIVENESS_THRESHOLD,
                passed=None
            )
            
        try:
            # 1. Recorte expandido 2.7x e resize para 80x80
            crop_80x80 = self._crop_face_with_scale(image, face_box, scale=2.7)
            
            # 2. Criar blob normalizado [0, 1] em formato NCHW BGR
            blob = cv2.dnn.blobFromImage(
                crop_80x80, 
                scalefactor=1.0 / 255.0, 
                size=(80, 80), 
                swapRB=False, 
                crop=False
            )
            
            # 3. Inferência no modelo MiniFASNetV2
            self.net.setInput(blob)
            out = self.net.forward()
            
            # 4. Softmax sobre os 3 logits [live, print-attack, replay-attack]
            logits = out[0]
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            
            live_score = float(probs[0])
            passed = bool(live_score >= settings.LIVENESS_THRESHOLD)
            
            return LivenessResult(
                available=True,
                score=live_score,
                threshold=settings.LIVENESS_THRESHOLD,
                passed=passed
            )
        except Exception as e:
            print(f"Erro na verificação de Liveness: {e}")
            return LivenessResult(
                available=False,
                score=None,
                threshold=settings.LIVENESS_THRESHOLD,
                passed=None
            )
