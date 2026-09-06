from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.interview_engine import get_next_question


router = APIRouter(
    prefix="/api/v1/interview",
    tags=["Adaptive Interview"],
)


class NextQuestionRequest(BaseModel):
    complaint: str
    answers: dict[str, Any] = {}


@router.post("/next-question")
def next_question(request: NextQuestionRequest):
    result = get_next_question(
        complaint=request.complaint,
        answers=request.answers,
    )

    return result