import os
import cv2
import numpy as np
import time
import csv
import uuid
from datetime import datetime
from typing import Dict, Any

from .face_detection import FaceDetector
from .face_recognition import FaceRecognizer
from .liveness import LivenessService
from ..config import settings
from ..schemas import VerifyResponse, LivenessResult

class VerificationPipeline:
    def __init__(self):
        self.detector = FaceDetector()
        self.recognizer = FaceRecognizer()
        self.liveness_service = LivenessService()
        
    def _read_image(self, file_bytes: bytes) -> np.ndarray:
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # Reduzir a imagem caso seja muito grande (evitar falha do YuNet)
        if img is not None:
            max_size = 1024
            h, w = img.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
                
        return img

    def verify(self, reference_bytes: bytes, selfie_bytes: bytes, same_person_expected: bool = None) -> VerifyResponse:
        ref_img = self._read_image(reference_bytes)
        selfie_img = self._read_image(selfie_bytes)

        test_id = str(uuid.uuid4())
        
        if settings.SAVE_TEST_IMAGES:
            img_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "results", "images")
            os.makedirs(img_dir, exist_ok=True)
            if ref_img is not None:
                cv2.imwrite(os.path.join(img_dir, f"{test_id}_ref.jpg"), ref_img)
            if selfie_img is not None:
                cv2.imwrite(os.path.join(img_dir, f"{test_id}_selfie.jpg"), selfie_img)
        
        t0 = time.time()
        
        if ref_img is None or selfie_img is None:
            return VerifyResponse(
                status="PROCESSING_ERROR",
                face_detected=False,
                liveness=LivenessResult(available=False)
            )
            
        t1 = time.time()
        
        # 1. Detecção na foto de referência
        ref_faces = self.detector.detect(ref_img)
        if len(ref_faces) == 0:
            return VerifyResponse(
                status="NO_FACE",
                face_detected=False,
                liveness=LivenessResult(available=False)
            )
        if len(ref_faces) > 1:
            return VerifyResponse(
                status="MULTIPLE_FACES",
                face_detected=True,
                liveness=LivenessResult(available=False)
            )
            
        ref_face = ref_faces[0]
        
        # 2. Detecção na selfie
        selfie_faces = self.detector.detect(selfie_img)
        if len(selfie_faces) == 0:
            return VerifyResponse(
                status="NO_FACE",
                face_detected=False,
                liveness=LivenessResult(available=False)
            )
        if len(selfie_faces) > 1:
            return VerifyResponse(
                status="MULTIPLE_FACES",
                face_detected=True,
                liveness=LivenessResult(available=False)
            )
            
        selfie_face = selfie_faces[0]
        
        t2 = time.time()
        
        # 3. Verificação de Liveness (Anti-Spoofing MiniFASNet)
        liveness_result = self.liveness_service.check_liveness(selfie_img, selfie_face)
        if liveness_result.available and not liveness_result.passed:
            return VerifyResponse(
                status="LIVENESS_FAILED",
                face_detected=True,
                similarity_score=None,
                face_match_threshold=settings.FACE_MATCH_THRESHOLD,
                face_match=False,
                liveness=liveness_result
            )
            
        t3 = time.time()
        
        # 4. Reconhecimento Facial (SFace)
        ref_aligned = self.recognizer.align_crop(ref_img, ref_face)
        ref_feature = self.recognizer.extract_feature(ref_aligned)
        
        selfie_aligned = self.recognizer.align_crop(selfie_img, selfie_face)
        selfie_feature = self.recognizer.extract_feature(selfie_aligned)
        
        score = self.recognizer.match(ref_feature, selfie_feature, cv2.FaceRecognizerSF_FR_COSINE)
        
        t4 = time.time()
        
        # Tempos em milissegundos
        detection_time = (t2 - t1) * 1000
        liveness_time = (t3 - t2) * 1000
        recognition_time = (t4 - t3) * 1000
        total_time = (t4 - t0) * 1000
        
        # Determinar match
        is_match = bool(score >= settings.FACE_MATCH_THRESHOLD)
        status = "VERIFIED" if is_match else "NOT_MATCH"
        
        # Gravar métricas em CSV de resultados
        try:
            timestamp = datetime.now().isoformat()
            csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "results", "results.csv")
            os.makedirs(os.path.dirname(csv_path), exist_ok=True)
            
            file_exists = os.path.exists(csv_path)
            with open(csv_path, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow([
                        "test_id", "timestamp", "same_person_expected", "similarity_score", 
                        "threshold", "face_match", "liveness_score", "liveness_passed", 
                        "detection_time_ms", "recognition_time_ms", "liveness_time_ms", "total_time_ms"
                    ])
                writer.writerow([
                    test_id, timestamp, same_person_expected, f"{score:.4f}",
                    settings.FACE_MATCH_THRESHOLD, is_match,
                    f"{liveness_result.score:.4f}" if liveness_result.score is not None else "",
                    liveness_result.passed if liveness_result.passed is not None else "",
                    f"{detection_time:.2f}", f"{recognition_time:.2f}", f"{liveness_time:.2f}", f"{total_time:.2f}"
                ])
        except Exception as e:
            print(f"Aviso ao salvar métricas: {e}")
        
        return VerifyResponse(
            status=status,
            face_detected=True,
            similarity_score=float(score),
            face_match_threshold=settings.FACE_MATCH_THRESHOLD,
            face_match=is_match,
            liveness=liveness_result,
        )
