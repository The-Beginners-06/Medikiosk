from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class PatientDemographics(BaseModel):
    name: str
    age: int = Field(ge=0, le=150)
    sex: Optional[str] = None
    preferred_language: str = "English"


class ChiefComplaint(BaseModel):
    complaint: str
    duration: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=0, le=10)


class HPI(BaseModel):
    onset: Optional[str] = None
    location: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    aggravating_factors: list[str] = []
    relieving_factors: list[str] = []
    associated_symptoms: list[str] = []
    previous_episodes: Optional[str] = None


class MedicalHistory(BaseModel):
    conditions: list[str] = []
    surgeries: list[str] = []
    medications: list[str] = []
    allergies: list[str] = []


class FamilyHistory(BaseModel):
    conditions: list[str] = []


class PersonalHistory(BaseModel):
    diet: Optional[str] = None
    sleep: Optional[str] = None
    activity: Optional[str] = None
    smoking: Optional[str] = None
    alcohol: Optional[str] = None


class ReviewOfSystems(BaseModel):
    positive_symptoms: list[str] = []
    negative_symptoms: list[str] = []


class RedFlag(BaseModel):
    detected: bool = False
    symptoms: list[str] = []
    priority: Optional[str] = None


class ClinicalHistory(BaseModel):
    patient: PatientDemographics
    chief_complaint: ChiefComplaint
    hpi: HPI = HPI()
    medical_history: MedicalHistory = MedicalHistory()
    family_history: FamilyHistory = FamilyHistory()
    personal_history: PersonalHistory = PersonalHistory()
    review_of_systems: ReviewOfSystems = ReviewOfSystems()
    red_flags: RedFlag = RedFlag()
    recorded_date: date = Field(default_factory=date.today)