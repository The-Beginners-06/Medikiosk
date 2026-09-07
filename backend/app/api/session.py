from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.session_service import (
    create_session,
    get_session,
    grant_consent,
    update_session,
    update_patient,
    get_completed_sessions,
    complete_session,
    update_review_status,
)

from app.services.red_flag_engine import detect_red_flags


router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["Patient Sessions"],
)


# -------------------------------------------------------------------
# REQUEST MODELS
# -------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    language: str = "English"


class ConsentRequest(BaseModel):
    purposes: list[str]


class UpdateSessionRequest(BaseModel):
    chief_complaint: str | None = None
    field: str | None = None
    answer: Any = None


class UpdatePatientRequest(BaseModel):
    name: str | None = None
    age: int | None = None
    sex: str | None = None


class ReviewStatusRequest(BaseModel):
    status: str


# -------------------------------------------------------------------
# CREATE SESSION
# -------------------------------------------------------------------

@router.post("")
def create_patient_session(
    request: CreateSessionRequest,
):
    return create_session(request.language)


# -------------------------------------------------------------------
# DOCTOR QUEUE
# -------------------------------------------------------------------

@router.get("/doctor/queue")
def doctor_queue():

    cases = get_completed_sessions()

    return {
        "count": len(cases),
        "cases": cases,
    }


# -------------------------------------------------------------------
# UPDATE DOCTOR REVIEW STATUS
# -------------------------------------------------------------------

@router.patch("/doctor/{session_id}/status")
def update_doctor_case_status(
    session_id: str,
    request: ReviewStatusRequest,
):

    try:
        session = update_review_status(
            session_id=session_id,
            status=request.status,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


# -------------------------------------------------------------------
# GET SESSION
# -------------------------------------------------------------------

@router.get("/{session_id}")
def read_patient_session(
    session_id: str,
):

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


# -------------------------------------------------------------------
# CONSENT
# -------------------------------------------------------------------

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


# -------------------------------------------------------------------
# UPDATE PATIENT INFORMATION
# -------------------------------------------------------------------

@router.patch("/{session_id}/patient")
def update_patient_information(
    session_id: str,
    request: UpdatePatientRequest,
):

    session = update_patient(
        session_id=session_id,
        name=request.name,
        age=request.age,
        sex=request.sex,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session


# -------------------------------------------------------------------
# UPDATE CLINICAL SESSION
# -------------------------------------------------------------------

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


# -------------------------------------------------------------------
# RED FLAG CHECK
# -------------------------------------------------------------------

@router.get("/{session_id}/red-flags")
def check_red_flags(
    session_id: str,
):

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    result = detect_red_flags(
        complaint=session.get(
            "chief_complaint"
        ) or "",
        answers=session.get(
            "answers"
        ) or {},
    )

    return result


# -------------------------------------------------------------------
# COMPLETE PATIENT SESSION
# -------------------------------------------------------------------

@router.post("/{session_id}/complete")
def complete_patient_session(
    session_id: str,
):

    session = complete_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return session