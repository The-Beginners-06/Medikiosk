from fastapi import APIRouter
from pydantic import BaseModel

from app.services.translation_service import translate_text


router = APIRouter(
    prefix="/api/v1/translation",
    tags=["Translation"],
)


class TranslationRequest(BaseModel):
    text: str
    target_language: str


@router.post("/translate")
def translate(request: TranslationRequest):
    translated = translate_text(
        text=request.text,
        target_language=request.target_language,
    )

    return {
        "original": request.text,
        "translated": translated,
        "target_language": request.target_language,
    }