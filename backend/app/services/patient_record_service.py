from typing import Any
from uuid import uuid4
from datetime import datetime, timezone
import json

from app.database import get_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_load(value: Any, default: Any) -> Any:
    if value is None or value == "":
        return default

    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default


def _row_to_dict(row) -> dict[str, Any]:
    return dict(row)


def _build_patient_record(patient_id: str) -> dict[str, Any] | None:
    with get_db() as connection:
        cursor = connection.cursor()

        patient = cursor.execute(
            """
            SELECT *
            FROM patients
            WHERE patient_id = ?
            """,
            (patient_id,),
        ).fetchone()

        if patient is None:
            return None

        medical_history_rows = cursor.execute(
            """
            SELECT text, recorded_at, source
            FROM medical_history
            WHERE patient_id = ?
            ORDER BY id ASC
            """,
            (patient_id,),
        ).fetchall()

        surgery_history_rows = cursor.execute(
            """
            SELECT text, recorded_at, source
            FROM surgery_history
            WHERE patient_id = ?
            ORDER BY id ASC
            """,
            (patient_id,),
        ).fetchall()

        medication_rows = cursor.execute(
            """
            SELECT text, recorded_at, source
            FROM medications
            WHERE patient_id = ?
            ORDER BY id ASC
            """,
            (patient_id,),
        ).fetchall()

        allergy_rows = cursor.execute(
            """
            SELECT text, recorded_at, source
            FROM allergies
            WHERE patient_id = ?
            ORDER BY id ASC
            """,
            (patient_id,),
        ).fetchall()

        document_rows = cursor.execute(
            """
            SELECT
                document_id,
                file_name,
                stored_file,
                content_type,
                file_size,
                document_type,
                uploaded_at,
                source,
                ocr_status,
                ocr_text,
                ocr_error,
                verified,
                clinical_validation,
                doctor_review,
                ocr_updated_at,
                validation_updated_at
            FROM documents
            WHERE patient_id = ?
            ORDER BY uploaded_at ASC
            """,
            (patient_id,),
        ).fetchall()

        visit_rows = cursor.execute(
            """
            SELECT
                visit_id,
                patient_id,
                date,
                chief_complaint,
                answers,
                red_flags,
                doctor_assessment
            FROM visits
            WHERE patient_id = ?
            ORDER BY date ASC
            """,
            (patient_id,),
        ).fetchall()

    documents = []

    for row in document_rows:
        document = _row_to_dict(row)

        document["verified"] = bool(document["verified"])

        document["clinical_validation"] = _json_load(
            document["clinical_validation"],
            None,
        )

        document["doctor_review"] = _json_load(
            document["doctor_review"],
            None,
        )

        documents.append(document)

    visits = []

    for row in visit_rows:
        visit = _row_to_dict(row)

        visit["answers"] = _json_load(
            visit["answers"],
            {},
        )

        visit["red_flags"] = _json_load(
            visit["red_flags"],
            None,
        )

        visit["doctor_assessment"] = _json_load(
            visit["doctor_assessment"],
            {
                "diagnosis": None,
                "procedure": None,
                "treatment": None,
                "notes": None,
                "follow_up": None,
            },
        )

        visits.append(visit)

    return {
        "patient_id": patient["patient_id"],
        "identity": {
            "name": patient["name"],
            "age": patient["age"],
            "sex": patient["sex"],
        },
        "medical_history": [
            dict(row) for row in medical_history_rows
        ],
        "surgery_history": [
            dict(row) for row in surgery_history_rows
        ],
        "medications": [
            dict(row) for row in medication_rows
        ],
        "allergies": [
            dict(row) for row in allergy_rows
        ],
        "documents": documents,
        "visits": visits,
        "created_at": patient["created_at"],
        "updated_at": patient["updated_at"],
    }


def get_or_create_patient_record(
    patient_id: str,
    name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
) -> dict[str, Any]:

    now = _now()

    with get_db() as connection:
        cursor = connection.cursor()

        existing = cursor.execute(
            """
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
            """,
            (patient_id,),
        ).fetchone()

        if existing is None:
            cursor.execute(
                """
                INSERT INTO patients (
                    patient_id,
                    name,
                    age,
                    sex,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    patient_id,
                    name,
                    age,
                    sex,
                    now,
                    now,
                ),
            )

        else:
            updates = []
            values = []

            if name is not None:
                updates.append("name = ?")
                values.append(name)

            if age is not None:
                updates.append("age = ?")
                values.append(age)

            if sex is not None:
                updates.append("sex = ?")
                values.append(sex)

            if updates:
                updates.append("updated_at = ?")
                values.append(now)
                values.append(patient_id)

                cursor.execute(
                    f"""
                    UPDATE patients
                    SET {", ".join(updates)}
                    WHERE patient_id = ?
                    """,
                    values,
                )

    return _build_patient_record(patient_id)


def get_patient_record(
    patient_id: str,
) -> dict[str, Any] | None:

    return _build_patient_record(patient_id)


def update_patient_identity(
    patient_id: str,
    name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
) -> dict[str, Any] | None:

    with get_db() as connection:
        cursor = connection.cursor()

        existing = cursor.execute(
            """
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
            """,
            (patient_id,),
        ).fetchone()

        if existing is None:
            return None

        updates = []
        values = []

        if name is not None:
            updates.append("name = ?")
            values.append(name.strip())

        if age is not None:
            updates.append("age = ?")
            values.append(age)

        if sex is not None:
            updates.append("sex = ?")
            values.append(sex)

        if updates:
            updates.append("updated_at = ?")
            values.append(_now())
            values.append(patient_id)

            cursor.execute(
                f"""
                UPDATE patients
                SET {", ".join(updates)}
                WHERE patient_id = ?
                """,
                values,
            )

    return _build_patient_record(patient_id)


def add_medical_history(
    patient_id: str,
    history: str,
) -> dict[str, Any] | None:

    text = history.strip()

    if not text:
        return _build_patient_record(patient_id)

    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO medical_history (
                patient_id,
                text,
                recorded_at,
                source
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                patient_id,
                text,
                _now(),
                "patient",
            ),
        )

    return _build_patient_record(patient_id)


def add_surgery_history(
    patient_id: str,
    text: str,
) -> dict[str, Any] | None:

    text = text.strip()

    if not text:
        return _build_patient_record(patient_id)

    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO surgery_history (
                patient_id,
                text,
                recorded_at,
                source
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                patient_id,
                text,
                _now(),
                "patient",
            ),
        )

    return _build_patient_record(patient_id)


def add_medication(
    patient_id: str,
    text: str,
) -> dict[str, Any] | None:

    text = text.strip()

    if not text:
        return _build_patient_record(patient_id)

    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO medications (
                patient_id,
                text,
                recorded_at,
                source
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                patient_id,
                text,
                _now(),
                "patient",
            ),
        )

    return _build_patient_record(patient_id)


def add_allergy(
    patient_id: str,
    text: str,
) -> dict[str, Any] | None:

    text = text.strip()

    if not text:
        return _build_patient_record(patient_id)

    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO allergies (
                patient_id,
                text,
                recorded_at,
                source
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                patient_id,
                text,
                _now(),
                "patient",
            ),
        )

    return _build_patient_record(patient_id)


def add_visit(
    patient_id: str,
    visit_id: str,
    date: str,
    chief_complaint: str | None = None,
    answers: dict[str, Any] | None = None,
    red_flags: Any = None,
) -> dict[str, Any] | None:

    with get_db() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO visits (
                visit_id,
                patient_id,
                date,
                chief_complaint,
                answers,
                red_flags,
                doctor_assessment
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                visit_id,
                patient_id,
                date,
                chief_complaint,
                json.dumps(
                    answers or {},
                    ensure_ascii=False,
                ),
                json.dumps(
                    red_flags,
                    ensure_ascii=False,
                )
                if red_flags is not None
                else None,
                json.dumps(
                    {
                        "diagnosis": None,
                        "procedure": None,
                        "treatment": None,
                        "notes": None,
                        "follow_up": None,
                    },
                    ensure_ascii=False,
                ),
            ),
        )

    return _build_patient_record(patient_id)


def add_document(
    patient_id: str,
    document: dict[str, Any],
) -> dict[str, Any] | None:

    with get_db() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO documents (
                document_id,
                patient_id,
                file_name,
                stored_file,
                content_type,
                file_size,
                document_type,
                uploaded_at,
                source,
                ocr_status,
                ocr_text,
                ocr_error,
                verified,
                clinical_validation,
                doctor_review,
                ocr_updated_at,
                validation_updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document["document_id"],
                patient_id,
                document.get("file_name", ""),
                document.get("stored_file", ""),
                document.get("content_type"),
                document.get("file_size"),
                document.get("document_type"),
                document.get("uploaded_at", _now()),
                document.get("source"),
                document.get("ocr_status"),
                document.get("ocr_text"),
                document.get("ocr_error"),
                1 if document.get("verified", False) else 0,
                json.dumps(
                    document.get("clinical_validation"),
                    ensure_ascii=False,
                )
                if document.get("clinical_validation") is not None
                else None,
                json.dumps(
                    document.get("doctor_review"),
                    ensure_ascii=False,
                )
                if document.get("doctor_review") is not None
                else None,
                document.get("ocr_updated_at"),
                document.get("validation_updated_at"),
            ),
        )

    return _build_patient_record(patient_id)


def update_document_ocr(
    patient_id: str,
    document_id: str,
    ocr_text: str,
    ocr_status: str,
    ocr_error: str | None = None,
) -> dict[str, Any] | None:

    with get_db() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE documents
            SET
                ocr_text = ?,
                ocr_status = ?,
                ocr_error = ?,
                ocr_updated_at = ?
            WHERE
                document_id = ?
                AND patient_id = ?
            """,
            (
                ocr_text,
                ocr_status,
                ocr_error,
                _now(),
                document_id,
                patient_id,
            ),
        )

    return _build_patient_record(patient_id)


def update_document_validation(
    patient_id: str,
    document_id: str,
    clinical_validation: dict[str, Any],
) -> dict[str, Any] | None:

    with get_db() as connection:
        connection.execute(
            """
            UPDATE documents
            SET
                clinical_validation = ?,
                verified = 0,
                validation_updated_at = ?
            WHERE
                document_id = ?
                AND patient_id = ?
            """,
            (
                json.dumps(
                    clinical_validation,
                    ensure_ascii=False,
                ),
                _now(),
                document_id,
                patient_id,
            ),
        )

    return _build_patient_record(patient_id)


def review_document(
    patient_id: str,
    document_id: str,
    doctor_id: str,
    verified: bool,
    notes: str | None = None,
) -> dict[str, Any] | None:

    with get_db() as connection:
        cursor = connection.cursor()

        row = cursor.execute(
            """
            SELECT clinical_validation
            FROM documents
            WHERE
                document_id = ?
                AND patient_id = ?
            """,
            (
                document_id,
                patient_id,
            ),
        ).fetchone()

        if row is None:
            return None

        clinical_validation = _json_load(
            row["clinical_validation"],
            None,
        )

        if verified and clinical_validation:
            warnings = clinical_validation.get(
                "warnings",
                [],
            )

            for warning in warnings:
                warning["verified"] = True

            clinical_validation["warnings"] = warnings
            clinical_validation["requires_doctor_verification"] = False
            clinical_validation["status"] = "verified"

        doctor_review = {
            "doctor_id": doctor_id,
            "verified": verified,
            "notes": notes,
            "reviewed_at": _now(),
        }

        cursor.execute(
            """
            UPDATE documents
            SET
                verified = ?,
                doctor_review = ?,
                clinical_validation = ?
            WHERE
                document_id = ?
                AND patient_id = ?
            """,
            (
                1 if verified else 0,
                json.dumps(
                    doctor_review,
                    ensure_ascii=False,
                ),
                json.dumps(
                    clinical_validation,
                    ensure_ascii=False,
                )
                if clinical_validation is not None
                else None,
                document_id,
                patient_id,
            ),
        )

    return _build_patient_record(patient_id)


def save_doctor_assessment(
    patient_id: str,
    session_id: str,
    chief_complaint: str | None,
    answers: dict[str, Any],
    red_flags: Any,
    assessment: dict[str, Any],
    doctor_id: str,
) -> dict[str, Any] | None:

    with get_db() as connection:
        cursor = connection.cursor()

        existing_visit = cursor.execute(
            """
            SELECT visit_id
            FROM visits
            WHERE
                visit_id = ?
                AND patient_id = ?
            """,
            (
                session_id,
                patient_id,
            ),
        ).fetchone()

        doctor_assessment = {
            "diagnosis": assessment.get("diagnosis"),
            "procedure": assessment.get("procedure"),
            "treatment": assessment.get("treatment"),
            "notes": assessment.get("notes"),
            "follow_up": assessment.get("follow_up"),
            "doctor_id": doctor_id,
            "recorded_at": _now(),
        }

        if existing_visit is None:
            cursor.execute(
                """
                INSERT INTO visits (
                    visit_id,
                    patient_id,
                    date,
                    chief_complaint,
                    answers,
                    red_flags,
                    doctor_assessment
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    patient_id,
                    _now(),
                    chief_complaint,
                    json.dumps(
                        answers or {},
                        ensure_ascii=False,
                    ),
                    json.dumps(
                        red_flags,
                        ensure_ascii=False,
                    )
                    if red_flags is not None
                    else None,
                    json.dumps(
                        doctor_assessment,
                        ensure_ascii=False,
                    ),
                ),
            )

        else:
            cursor.execute(
                """
                UPDATE visits
                SET
                    doctor_assessment = ?
                WHERE
                    visit_id = ?
                    AND patient_id = ?
                """,
                (
                    json.dumps(
                        doctor_assessment,
                        ensure_ascii=False,
                    ),
                    session_id,
                    patient_id,
                ),
            )

    return _build_patient_record(patient_id)