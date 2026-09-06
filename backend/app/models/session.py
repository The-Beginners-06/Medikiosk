from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class ConsentRecord(BaseModel):
    granted: bool = False
    granted_at: Optional[datetime] = None
    purpose: list[str] = []


class PatientSession(BaseModel):
    session_id: str
    status: str = "created"

    language: str = "English"
    consent: ConsentRecord = ConsentRecord()

    patient_id: Optional[str] = None

    chief_complaint: Optional[str] = None
    answers: dict[str, Any] = {}

    current_field: Optional[str] = None
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    completed_at: Optional[datetime] = None