from datetime import datetime, timezone
from uuid import uuid4

from app.models.session import ConsentRecord, PatientSession


# Temporary in-memory store for development.
# We will replace this with a proper database later.
_sessions: dict[str, PatientSession] = {}


def create_session(language: str = "English") -> PatientSession:
    session = PatientSession(
        session_id=str(uuid4()),
        language=language,
    )

    _sessions[session.session_id] = session

    return session


def get_session(session_id: str) -> PatientSession | None:
    return _sessions.get(session_id)


def grant_consent(
    session_id: str,
    purposes: list[str],
) -> PatientSession | None:

    session = get_session(session_id)

    if session is None:
        return None

    session.consent = ConsentRecord(
        granted=True,
        granted_at=datetime.now(timezone.utc),
        purpose=purposes,
    )

    session.status = "consented"

    return session


def update_session(
    session_id: str,
    chief_complaint: str | None = None,
    field: str | None = None,
    answer: object | None = None,
) -> PatientSession | None:

    session = get_session(session_id)

    if session is None:
        return None

    if chief_complaint is not None:
        session.chief_complaint = chief_complaint
        session.status = "interviewing"

    if field is not None:
        session.answers[field] = answer

    return session