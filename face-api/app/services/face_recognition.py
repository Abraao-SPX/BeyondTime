import cv2
import numpy as np
import os

class FaceRecognizer:
    def __init__(self, model_path: str = "models/face_recognition_sface_2021dec.onnx"):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_model_path = os.path.join(base_dir, model_path)
        
        if not os.path.exists(full_model_path):
            raise FileNotFoundError(f"Model not found at {full_model_path}")
            
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=full_model_path,
            config=""
        )
        
    def align_crop(self, image: np.ndarray, face_box):
        return self.recognizer.alignCrop(image, face_box)
        
    def extract_feature(self, aligned_image: np.ndarray):
        return self.recognizer.feature(aligned_image)
        
    def match(self, feature1: np.ndarray, feature2: np.ndarray, dis_type=cv2.FaceRecognizerSF_FR_COSINE):
        return self.recognizer.match(feature1, feature2, dis_type)

