import cv2
import numpy as np
import os

class FaceDetector:
    def __init__(self, model_path: str = "models/face_detection_yunet_2023mar.onnx"):
        # Resolve path relative to api root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_model_path = os.path.join(base_dir, model_path)
        
        if not os.path.exists(full_model_path):
            raise FileNotFoundError(f"Model not found at {full_model_path}. Please run download_models.sh")
            
        self.detector = cv2.FaceDetectorYN.create(
            model=full_model_path,
            config="",
            input_size=[320, 320], # will be updated on inference
            score_threshold=0.9,
            nms_threshold=0.3,
            top_k=5000
        )
        
    def detect(self, image: np.ndarray):
        height, width, _ = image.shape
        self.detector.setInputSize((width, height))
        
        faces = self.detector.detect(image)
        # faces is a tuple (status, faces_data)
        if faces[1] is None:
            return []
        
        return faces[1]

