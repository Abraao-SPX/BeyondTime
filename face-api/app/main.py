from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from .schemas import VerifyResponse, LivenessResult
from .config import settings
from .services.verification import VerificationPipeline

app = FastAPI(title="BeyondTime Face Test API")

# CORS setup for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Should be restrictive in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/verify", response_model=VerifyResponse)
async def verify_faces(
    reference_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    same_person_expected: bool = Form(None)
):
    pipeline = VerificationPipeline()
    ref_bytes = await reference_image.read()
    selfie_bytes = await selfie_image.read()
    
    result = pipeline.verify(ref_bytes, selfie_bytes, same_person_expected)
    return result
