import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    FACE_MATCH_THRESHOLD: float = 0.60 # DEFAULT_EXPERIMENTAL_THRESHOLD, source: OpenCV Zoo / SFace defaults
    LIVENESS_THRESHOLD: float = 0.80
    SAVE_TEST_IMAGES: bool = True
    
    model_config = {"env_file": os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")}

settings = Settings()
