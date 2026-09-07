from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.session_service import (
    create_session,
    get_session,
    grant_consent,
    update_session,
    get_completed_sessions,
)

from app.services.red_flag_engine import detect_red_flags


router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["Patient Sessions"],
)


class CreateSessionRequest(BaseModel):
    language: str = "English"


class ConsentRequest(BaseModel):
    purposes: list[str]


class UpdateSessionRequest(BaseModel):
    chief_complaint: str | None = None
    field: str | None = None
    answer: Any = None


@router.post("")
def create_patient_session(request: CreateSessionRequest):
    return create_session(request.language)


@router.get("/{session_id}")
def read_patient_session(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


@router.post("/{session_id}/consent")
def record_consent(
    session_id: str,
    request: ConsentRequest,
):
    session = grant_consent(
        session_id,
        request.purposes,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


@router.patch("/{session_id}")
def update_patient_session(
    session_id: str,
    request: UpdateSessionRequest,
):
    session = update_session(
        session_id=session_id,
        chief_complaint=request.chief_complaint,
        field=request.field,
        answer=request.answer,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


@router.get("/{session_id}/red-flags")
def check_red_flags(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    result = detect_red_flags(
        complaint=session.get("chief_complaint") or "",
        answers=session.get("answers") or {},
    )

    return result

@router.get("/doctor/queue")
def doctor_queue():
    return {
        "count": len(get_completed_sessions()),
        "cases": get_completed_sessions(),
    }

@router.post("/{session_id}/complete")
def complete_patient_session(session_id: str):
    from app.services.session_service import complete_session

    session = complete_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session