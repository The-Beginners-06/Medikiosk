from typing import Any
from uuid import uuid4
from datetime import datetime, timezone


# -------------------------------------------------------------------
# MediKiosk Patient Session Service
# -------------------------------------------------------------------
# Temporary in-memory storage for the MediKiosk MVP.
#
# Session lifecycle:
#
# created
#    ↓
# consented
#    ↓
# interview_started
#    ↓
# interview_in_progress
#    ↓
# waiting
#    ↓
# in_review
#    ↓
# reviewed
#
# Later this service can be connected to PostgreSQL / ABDM-compatible
# infrastructure.
# -------------------------------------------------------------------


SESSIONS: dict[str, dict[str, Any]] = {}


# -------------------------------------------------------------------
# CREATE SESSION
# -------------------------------------------------------------------

def create_session(
    language: str = "English",
    patient_id: str | None = None,
) -> dict[str, Any]:
    """
    Create a new MediKiosk patient session.
    """

    session_id = str(uuid4())

    session = {
        "session_id": session_id,
"patient_id": patient_id,
"language": language,

        "consent": {
            "granted": False,
            "purposes": [],
        },

        "patient": {
            "name": None,
            "age": None,
            "sex": None,
        },

        "chief_complaint": None,

        "answers": {},

        "status": "created",

        "started_at": datetime.now(timezone.utc).isoformat(),

        "completed_at": None,

        "reviewed_at": None,
    }

    SESSIONS[session_id] = session

    return session


# -------------------------------------------------------------------
# GET SESSION
# -------------------------------------------------------------------

def get_session(
    session_id: str,
) -> dict[str, Any] | None:
    """
    Retrieve an existing patient session.
    """

    return SESSIONS.get(session_id)


# -------------------------------------------------------------------
# GRANT CONSENT
# -------------------------------------------------------------------

def grant_consent(
    session_id: str,
    purposes: list[str],
) -> dict[str, Any] | None:
    """
    Record patient consent.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["consent"] = {
        "granted": True,
        "purposes": purposes,
        "granted_at": datetime.now(timezone.utc).isoformat(),
    }

    session["status"] = "consented"

    return session


# -------------------------------------------------------------------
# UPDATE PATIENT INFORMATION
# -------------------------------------------------------------------

def update_patient(
    session_id: str,
    name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
) -> dict[str, Any] | None:
    """
    Save basic patient information.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    patient = session["patient"]

    if name is not None:
        patient["name"] = name.strip()

    if age is not None:
        patient["age"] = age

    if sex is not None:
        patient["sex"] = sex

    return session


# -------------------------------------------------------------------
# UPDATE SESSION
# -------------------------------------------------------------------

def update_session(
    session_id: str,
    chief_complaint: str | None = None,
    field: str | None = None,
    answer: Any = None,
) -> dict[str, Any] | None:
    """
    Update information collected during the clinical interview.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    # Save chief complaint
    if chief_complaint is not None:
        session["chief_complaint"] = chief_complaint.strip()

        if session["status"] == "consented":
            session["status"] = "interview_started"

    # Save structured answer
    if field is not None and field.strip():
        session["answers"][field] = answer
        session["status"] = "interview_in_progress"

    return session


# -------------------------------------------------------------------
# COMPLETE SESSION
# -------------------------------------------------------------------

def complete_session(
    session_id: str,
) -> dict[str, Any] | None:
    """
    Mark the patient interview as completed.

    Once completed, the case enters the doctor's queue
    with status = waiting.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["status"] = "waiting"

    session["completed_at"] = datetime.now(
        timezone.utc
    ).isoformat()

    return session


# -------------------------------------------------------------------
# UPDATE DOCTOR REVIEW STATUS
# -------------------------------------------------------------------

def update_review_status(
    session_id: str,
    status: str,
) -> dict[str, Any] | None:
    """
    Update the doctor's review workflow status.

    Allowed statuses:

    waiting
    in_review
    reviewed
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    allowed_statuses = {
        "waiting",
        "in_review",
        "reviewed",
    }

    if status not in allowed_statuses:
        raise ValueError(
            f"Invalid review status: {status}"
        )

    session["status"] = status

    if status == "reviewed":
        session["reviewed_at"] = datetime.now(
            timezone.utc
        ).isoformat()

    return session


# -------------------------------------------------------------------
# GET DOCTOR CASES
# -------------------------------------------------------------------

def get_completed_sessions() -> list[dict[str, Any]]:
    """
    Return completed patient cases.

    Includes all cases that have entered the doctor workflow:

    waiting
    in_review
    reviewed
    """

    doctor_cases = []

    for session in SESSIONS.values():

        if session.get("status") in {
            "waiting",
            "in_review",
            "reviewed",
        }:
            doctor_cases.append(session)

    # Newest completed cases first
    doctor_cases.sort(
        key=lambda session: session.get(
            "completed_at"
        ) or "",
        reverse=True,
    )

    return doctor_cases