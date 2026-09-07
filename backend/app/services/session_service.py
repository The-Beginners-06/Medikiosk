from typing import Any
from uuid import uuid4


# -------------------------------------------------------------------
# MediKiosk Patient Session Service
# -------------------------------------------------------------------
# This service manages the temporary patient session during
# the clinical intake process.
#
# It stores:
# - selected language
# - consent
# - patient information
# - chief complaint
# - structured interview answers
#
# This is currently an in-memory MVP.
# Later, it can be connected to PostgreSQL or another database.
# -------------------------------------------------------------------


# Temporary in-memory session storage
SESSIONS: dict[str, dict[str, Any]] = {}


# -------------------------------------------------------------------
# CREATE SESSION
# -------------------------------------------------------------------

def create_session(language: str = "English") -> dict[str, Any]:
    """
    Create a new MediKiosk patient session.
    """

    session_id = str(uuid4())

    session = {
        "session_id": session_id,

        # Patient-selected language
        "language": language,

        # Consent information
        "consent": {
            "granted": False,
            "purposes": [],
        },

        # Basic patient information
        "patient": {
            "name": None,
            "age": None,
            "sex": None,
        },

        # Main presenting complaint
        "chief_complaint": None,

        # Structured clinical interview answers
        #
        # Example:
        # {
        #     "onset": "Yesterday",
        #     "duration": "1 day",
        #     "severity": "102°F",
        #     "associated_symptoms": "Headache"
        # }
        "answers": {},

        # Session status
        "status": "created",
    }

    SESSIONS[session_id] = session

    return session


# -------------------------------------------------------------------
# GET SESSION
# -------------------------------------------------------------------

def get_session(session_id: str) -> dict[str, Any] | None:
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
    Record patient consent for the specified purposes.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["consent"] = {
        "granted": True,
        "purposes": purposes,
    }

    session["status"] = "consented"

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
    Update information collected during the clinical intake.

    The function supports two types of updates:

    1. Chief complaint

       chief_complaint="fever"

    2. Structured interview answer

       field="onset"
       answer="Yesterday evening"

    This allows the adaptive interview engine to build a
    structured clinical history.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    # ---------------------------------------------------------------
    # Save chief complaint
    # ---------------------------------------------------------------

    if chief_complaint is not None:

        session["chief_complaint"] = chief_complaint.strip()

        session["status"] = "interview_started"


    # ---------------------------------------------------------------
    # Save structured interview answer
    # ---------------------------------------------------------------

    if field is not None:

        # Ignore empty field names
        if field.strip():

            session["answers"][field] = answer

            session["status"] = "interview_in_progress"


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
# COMPLETE SESSION
# -------------------------------------------------------------------

def complete_session(
    session_id: str,
) -> dict[str, Any] | None:
    """
    Mark the clinical intake session as completed.
    """

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["status"] = "completed"

    return session