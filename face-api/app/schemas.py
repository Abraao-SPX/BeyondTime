from pydantic import BaseModel
from typing import Optional

class LivenessResult(BaseModel):
    available: bool
    score: Optional[float] = None
    threshold: Optional[float] = None
    passed: Optional[bool] = None

class VerifyResponse(BaseModel):
    status: str
    face_detected: bool
    similarity_score: Optional[float] = None
    face_match_threshold: Optional[float] = None
    face_match: Optional[bool] = None
    liveness: LivenessResult

