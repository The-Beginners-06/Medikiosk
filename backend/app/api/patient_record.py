from pathlib import Path
from typing import Any
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Form,
)

from pydantic import BaseModel

from app.services.patient_record_service import (
    get_or_create_patient_record,
    get_patient_record,
    update_patient_identity,
    add_medical_history,
    add_surgery_history,
    add_medication,
    add_allergy,
    add_document,
    update_document_ocr,
    update_document_validation,
    review_document,
    save_doctor_assessment,
)

from app.services.ocr_service import (
    extract_text_from_document,
)

from app.services.clinical_validation_service import (
    validate_ocr_text,
)


router = APIRouter(
    prefix="/api/v1/patients",
    tags=["Patient Clinical Records"],
)


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
}


BACKEND_DIR = Path(__file__).resolve().parents[2]

UPLOAD_DIR = (
    BACKEND_DIR
    / "uploads"
    / "medical_documents"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------

class PatientIdentityRequest(BaseModel):

    name: str | None = None
    age: int | None = None
    sex: str | None = None


class HistoryRequest(BaseModel):

    text: str


class MedicationRequest(BaseModel):

    text: str


class AllergyRequest(BaseModel):

    text: str


class DocumentReviewRequest(BaseModel):

    doctor_id: str
    verified: bool = True
    notes: str | None = None


class DoctorAssessmentRequest(BaseModel):

    doctor_id: str
    diagnosis: str | None = None
    procedure: str | None = None
    treatment: str | None = None
    notes: str | None = None
    follow_up: str | None = None
    chief_complaint: str | None = None
    answers: dict[str, Any] = {}
    red_flags: Any = None


# ---------------------------------------------------------
# Create / Get Patient Record
# ---------------------------------------------------------

@router.post("/{patient_id}")
def create_patient_record(
    patient_id: str,
    request: PatientIdentityRequest,
):

    try:

        patient = get_or_create_patient_record(
            patient_id=patient_id,
            name=request.name,
            age=request.age,
            sex=request.sex,
        )

        return patient

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ---------------------------------------------------------
# Get Patient Record
# ---------------------------------------------------------

@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
):

    patient = get_patient_record(
        patient_id
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Update Patient Identity
# ---------------------------------------------------------

@router.patch("/{patient_id}/identity")
def update_identity(
    patient_id: str,
    request: PatientIdentityRequest,
):

    patient = update_patient_identity(
        patient_id=patient_id,
        name=request.name,
        age=request.age,
        sex=request.sex,
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Add Medical History
# ---------------------------------------------------------

@router.post("/{patient_id}/medical-history")
def add_medical_history_record(
    patient_id: str,
    request: HistoryRequest,
):

    patient = add_medical_history(
        patient_id=patient_id,
        history=request.text,
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Add Surgery History
# ---------------------------------------------------------

@router.post("/{patient_id}/surgery-history")
def add_surgery_history_record(
    patient_id: str,
    request: HistoryRequest,
):

    patient = add_surgery_history(
        patient_id=patient_id,
       text=request.text
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Add Medication
# ---------------------------------------------------------

@router.post("/{patient_id}/medications")
def add_medication_record(
    patient_id: str,
    request: MedicationRequest,
):

    patient = add_medication(
        patient_id=patient_id,
        text=request.text,
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Add Allergy
# ---------------------------------------------------------

@router.post("/{patient_id}/allergies")
def add_allergy_record(
    patient_id: str,
    request: AllergyRequest,
):

    patient = add_allergy(
        patient_id=patient_id,
        text=request.text,
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Doctor document review
# ---------------------------------------------------------

@router.patch("/{patient_id}/documents/{document_id}/verification")
def review_uploaded_document(
    patient_id: str,
    document_id: str,
    request: DocumentReviewRequest,
):

    patient = review_document(
        patient_id=patient_id,
        document_id=document_id,
        doctor_id=request.doctor_id,
        verified=request.verified,
        notes=request.notes,
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient record or document was not found.",
        )

    return patient


# ---------------------------------------------------------
# Doctor assessment for one completed session
# ---------------------------------------------------------

@router.post("/{patient_id}/visits/{session_id}/assessment")
def save_current_visit_assessment(
    patient_id: str,
    session_id: str,
    request: DoctorAssessmentRequest,
):

    assessment = {
        "diagnosis": request.diagnosis,
        "procedure": request.procedure,
        "treatment": request.treatment,
        "notes": request.notes,
        "follow_up": request.follow_up,
    }

    patient = save_doctor_assessment(
        patient_id=patient_id,
        session_id=session_id,
        chief_complaint=request.chief_complaint,
        answers=request.answers,
        red_flags=request.red_flags,
        assessment=assessment,
        doctor_id=request.doctor_id,
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )

    return patient


# ---------------------------------------------------------
# Upload Medical Document + OCR
# ---------------------------------------------------------

@router.post("/{patient_id}/documents")
async def upload_medical_document(
    patient_id: str,

    file: UploadFile = File(...),

    document_type: str = Form(
        "Medical Document"
    ),
):

    # -----------------------------------------------------
    # Verify patient
    # -----------------------------------------------------

    patient = get_patient_record(
        patient_id
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient record not found.",
        )


    # -----------------------------------------------------
    # Validate filename
    # -----------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="File name is missing.",
        )


    safe_filename = Path(
        file.filename
    ).name

    extension = Path(
        safe_filename
    ).suffix.lower()


    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported document type. "
                "Supported formats: PDF, PNG, JPG, JPEG."
            ),
        )


    # -----------------------------------------------------
    # Read file
    # -----------------------------------------------------

    contents = await file.read()


    # -----------------------------------------------------
    # Validate size
    # -----------------------------------------------------

    if len(contents) > MAX_DOCUMENT_SIZE:

        raise HTTPException(
            status_code=413,
            detail=(
                "File is too large. "
                "Maximum allowed size is 10 MB."
            ),
        )


    # -----------------------------------------------------
    # Generate unique stored filename
    # -----------------------------------------------------

    document_id = str(uuid4())

    stored_filename = (
        f"{document_id}{extension}"
    )

    stored_path = (
        UPLOAD_DIR
        / stored_filename
    )


    # -----------------------------------------------------
    # Save original document
    # -----------------------------------------------------

    try:

        stored_path.write_bytes(
            contents
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to save document: {error}"
            ),
        )


    # -----------------------------------------------------
    # Create document metadata
    # -----------------------------------------------------

    document = {

        "document_id": document_id,

        "file_name": safe_filename,

        "stored_file": str(
            Path("uploads")
            / "medical_documents"
            / stored_filename
        ),

        "content_type": (
            file.content_type
            or "application/octet-stream"
        ),

        "file_size": len(contents),

        "document_type": (
            document_type.strip()
            or "Medical Document"
        ),

        "uploaded_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "source": "patient",

        "ocr_status": "processing",

        "ocr_text": "",

        "verified": False,

        "clinical_validation": {
            "status": "processing",
            "warnings": [],
            "warning_count": 0,
            "requires_doctor_verification": False,
        },
    }


    # -----------------------------------------------------
    # Store document immediately
    # -----------------------------------------------------

    add_document(
        patient_id,
        document,
    )


    # -----------------------------------------------------
    # Run OCR
    # -----------------------------------------------------

    try:

        ocr_text = extract_text_from_document(
            stored_path
        )

        # -------------------------------------------------
        # Save RAW OCR text
        # -------------------------------------------------
        #
        # IMPORTANT:
        # Never modify or automatically correct this text.
        #

        update_document_ocr(
            patient_id=patient_id,
            document_id=document_id,
            ocr_text=ocr_text,
            ocr_status="completed",
        )


        # -------------------------------------------------
        # Clinical OCR Validation
        # -------------------------------------------------
        #
        # This checks the OCR text for potentially
        # suspicious clinical values.
        #
        # It does NOT change the OCR text.
        #

        validation_result = validate_ocr_text(
            ocr_text
        )


        update_document_validation(
            patient_id=patient_id,
            document_id=document_id,
         clinical_validation=validation_result,
        )


    except Exception as error:

        update_document_ocr(
            patient_id=patient_id,
            document_id=document_id,
            ocr_text="",
            ocr_status="failed",
            ocr_error=str(error),
        )

        return {
            "message": (
                "Document uploaded successfully, "
                "but OCR processing failed."
            ),

            "document": {
                **document,
                "ocr_status": "failed",
                "ocr_text": "",
                "ocr_error": str(error),
            },

            "patient_id": patient_id,
        }


    # -----------------------------------------------------
    # Return final document information
    # -----------------------------------------------------

    updated_patient = get_patient_record(
        patient_id
    )

    final_document = None

    if updated_patient:

        for saved_document in updated_patient[
            "documents"
        ]:

            if (
                saved_document["document_id"]
                == document_id
            ):

                final_document = saved_document

                break


    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return {

        "message": (
            "Medical document uploaded and "
            "OCR processed successfully."
        ),

        "document": final_document,

        "patient_id": patient_id,
    }
