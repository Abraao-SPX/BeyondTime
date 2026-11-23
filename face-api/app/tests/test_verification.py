import pytest
import os
import cv2
import numpy as np
from app.services.verification import VerificationPipeline

def create_dummy_image(color, size=(400, 400, 3)):
    img = np.zeros(size, dtype=np.uint8)
    img[:] = color
    # Encode as jpg
    _, encoded = cv2.imencode('.jpg', img)
    return encoded.tobytes()

def test_pipeline_no_face():
    pipeline = VerificationPipeline()
    # Create blank images
    ref_bytes = create_dummy_image((0, 0, 0))
    selfie_bytes = create_dummy_image((255, 255, 255))
    
    result = pipeline.verify(ref_bytes, selfie_bytes)
    assert result.status == "NO_FACE"
    assert result.face_detected == False

