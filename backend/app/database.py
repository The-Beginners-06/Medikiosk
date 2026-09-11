import sqlite3
from pathlib import Path
from contextlib import contextmanager


# ---------------------------------------------------------
# MediKiosk SQLite Database
# ---------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parents[1]

DATABASE_PATH = BACKEND_DIR / "medikiosk.db"


@contextmanager
def get_db():
    """
    Open a SQLite database connection.

    The connection is automatically committed on success
    and rolled back if an error occurs.
    """

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    try:
        yield connection
        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def initialize_database():
    """
    Create all MediKiosk database tables if they don't exist.
    """

    with get_db() as connection:

        cursor = connection.cursor()

        # -------------------------------------------------
        # Patients
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                patient_id TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER,
                sex TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        # -------------------------------------------------
        # Medical History
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS medical_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                text TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                source TEXT NOT NULL,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )

        # -------------------------------------------------
        # Surgery History
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS surgery_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                text TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                source TEXT NOT NULL,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )

        # -------------------------------------------------
        # Medications
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                text TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                source TEXT NOT NULL,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )

        # -------------------------------------------------
        # Allergies
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS allergies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                text TEXT NOT NULL,
                recorded_at TEXT NOT NULL,
                source TEXT NOT NULL,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )

        # -------------------------------------------------
        # Medical Documents
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                stored_file TEXT NOT NULL,
                content_type TEXT,
                file_size INTEGER,
                document_type TEXT,
                uploaded_at TEXT NOT NULL,
                source TEXT,
                ocr_status TEXT,
                ocr_text TEXT,
                ocr_error TEXT,
                verified INTEGER NOT NULL DEFAULT 0,
                clinical_validation TEXT,
                doctor_review TEXT,
                ocr_updated_at TEXT,
                validation_updated_at TEXT,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )

        # -------------------------------------------------
        # Patient Visits
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS visits (
                visit_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                date TEXT NOT NULL,
                chief_complaint TEXT,
                answers TEXT,
                red_flags TEXT,
                doctor_assessment TEXT,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(patient_id)
            )
            """
        )