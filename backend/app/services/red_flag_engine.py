from typing import Any


def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip().lower()


def detect_red_flags(
    complaint: str,
    answers: dict[str, Any],
) -> dict[str, Any]:

    complaint_text = normalize_text(complaint)

    all_text = " ".join(
        [
            complaint_text,
            *[
                normalize_text(value)
                for value in answers.values()
            ],
        ]
    )

    flags = []

    # -------------------------------------------------
    # CHEST PAIN RED FLAGS
    # -------------------------------------------------

    chest_pain_terms = [
        "chest pain",
        "pain in chest",
        "chest discomfort",
        "pressure in chest",
        "tightness in chest",
    ]

    breathing_terms = [
        "difficulty breathing",
        "breathing difficulty",
        "shortness of breath",
        "breathlessness",
        "can't breathe",
        "cannot breathe",
    ]

    sweating_terms = [
        "sweating",
        "sweating heavily",
        "cold sweat",
    ]

    fainting_terms = [
        "fainted",
        "fainting",
        "passed out",
        "unconscious",
    ]

    chest_pain = any(
        term in all_text
        for term in chest_pain_terms
    )

    breathing_difficulty = any(
        term in all_text
        for term in breathing_terms
    )

    sweating = any(
        term in all_text
        for term in sweating_terms
    )

    fainting = any(
        term in all_text
        for term in fainting_terms
    )

    if chest_pain and (
        breathing_difficulty
        or sweating
        or fainting
    ):
        flags.append(
            {
                "type": "chest_pain",
                "severity": "urgent",
                "message": (
                    "Chest pain with additional concerning "
                    "symptoms was reported."
                ),
            }
        )

    # -------------------------------------------------
    # SEVERE BREATHING DIFFICULTY
    # -------------------------------------------------

    severe_breathing_terms = [
        "cannot breathe",
        "can't breathe",
        "unable to breathe",
        "very difficult to breathe",
        "severe breathing difficulty",
    ]

    if any(
        term in all_text
        for term in severe_breathing_terms
    ):
        flags.append(
            {
                "type": "breathing",
                "severity": "urgent",
                "message": (
                    "Severe breathing difficulty was reported."
                ),
            }
        )

    # -------------------------------------------------
    # FAINTING / LOSS OF CONSCIOUSNESS
    # -------------------------------------------------

    if fainting:
        flags.append(
            {
                "type": "fainting",
                "severity": "urgent",
                "message": (
                    "Fainting or loss of consciousness "
                    "was reported."
                ),
            }
        )

    # -------------------------------------------------
    # SEVERE HEADACHE + NEUROLOGICAL SYMPTOMS
    # -------------------------------------------------

    headache_terms = [
        "severe headache",
        "worst headache",
        "very severe headache",
        "sudden severe headache",
    ]

    neurological_terms = [
        "weakness",
        "numbness",
        "confusion",
        "difficulty speaking",
        "slurred speech",
        "vision loss",
        "blurred vision",
        "seizure",
        "convulsion",
    ]

    severe_headache = any(
        term in all_text
        for term in headache_terms
    )

    neurological_symptom = any(
        term in all_text
        for term in neurological_terms
    )

    if severe_headache and neurological_symptom:
        flags.append(
            {
                "type": "neurological",
                "severity": "urgent",
                "message": (
                    "Severe headache with a neurological "
                    "symptom was reported."
                ),
            }
        )

    # -------------------------------------------------
    # GENERAL SEVERE SYMPTOMS
    # -------------------------------------------------

    emergency_terms = [
        "severe bleeding",
        "heavy bleeding",
        "vomiting blood",
        "blood in vomit",
        "black stool",
        "seizure",
        "unconscious",
        "unresponsive",
    ]

    if any(
        term in all_text
        for term in emergency_terms
    ):
        flags.append(
            {
                "type": "general",
                "severity": "urgent",
                "message": (
                    "A potentially serious symptom "
                    "was reported."
                ),
            }
        )

    # -------------------------------------------------
    # FINAL RESULT
    # -------------------------------------------------

    if flags:
        return {
            "has_red_flags": True,
            "urgency": "urgent",
            "message": (
                "Please alert a healthcare professional "
                "immediately. Some of your responses may "
                "require urgent clinical attention."
            ),
            "flags": flags,
        }

    return {
        "has_red_flags": False,
        "urgency": "routine",
        "message": (
            "No predefined urgent warning pattern "
            "was detected."
        ),
        "flags": [],
    }