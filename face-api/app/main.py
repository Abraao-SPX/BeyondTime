import os
import threading
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from .schemas import VerifyResponse
from .config import settings
from .services.verification import VerificationPipeline

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

app = FastAPI(title="BeyondTime Face Verification API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:8085,https://bytime.me").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

_pipeline: VerificationPipeline | None = None
_pipeline_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_pipeline() -> VerificationPipeline:
    global _pipeline
    if _pipeline is None:
        with _pipeline_lock:
            if _pipeline is None:
                _pipeline = VerificationPipeline()
    return _pipeline


def _has_valid_image_magic_bytes(data: bytes) -> bool:
    is_jpeg = data[:3] == b"\xff\xd8\xff"
    is_png = data[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return is_jpeg or is_png or is_webp


async def _read_validated_image(upload: UploadFile) -> bytes:
    if upload.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Formato de imagem não suportado. Utilize JPEG, PNG ou WebP.",
        )

    data = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Imagem excede o tamanho máximo permitido de 5 MB.",
        )
    if len(data) == 0:
        raise HTTPException(
            status_code=400,
            detail="Arquivo de imagem vazio.",
        )
    if not _has_valid_image_magic_bytes(data):
        raise HTTPException(
            status_code=400,
            detail="Assinatura binária da imagem inválida.",
        )
    return data


def _verify_locked(
    ref_bytes: bytes,
    selfie_bytes: bytes,
    same_person_expected: bool | None,
) -> VerifyResponse:
    pipeline = get_pipeline()
    with _inference_lock:
        return pipeline.verify(ref_bytes, selfie_bytes, same_person_expected)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/verify", response_model=VerifyResponse)
async def verify_faces(
    reference_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    same_person_expected: bool = Form(None)
):
    ref_bytes = await _read_validated_image(reference_image)
    selfie_bytes = await _read_validated_image(selfie_image)

    return await run_in_threadpool(_verify_locked, ref_bytes, selfie_bytes, same_person_expected)
