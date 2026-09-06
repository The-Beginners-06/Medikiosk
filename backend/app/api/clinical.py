from fastapi import APIRouter

from app.models.clinical import ClinicalHistory

router = APIRouter(
    prefix="/api/v1/clinical",
    tags=["Clinical History"],
)


@router.post("/validate")
def validate_clinical_history(history: ClinicalHistory):
    return {
        "valid": True,
        "message": "Clinical history validated successfully",
        "data": history.model_dump(),
    }