import re
from typing import Any


# ---------------------------------------------------------
# Clinical OCR Validation
# ---------------------------------------------------------
#
# IMPORTANT:
# This service NEVER changes OCR text.
#
# It only detects potentially suspicious values and creates
# warnings so that a doctor can verify them against the
# original document.
# ---------------------------------------------------------


def _warning(
    field: str,
    value: str,
    reason: str,
) -> dict[str, Any]:
    """
    Create a standardized clinical validation warning.
    """

    return {
        "field": field,
        "value": value,
        "reason": reason,
        "severity": "review_required",
        "verified": False,
    }


# ---------------------------------------------------------
# Hemoglobin Validation
# ---------------------------------------------------------

def validate_hemoglobin(
    text: str,
) -> list[dict[str, Any]]:

    warnings = []

    pattern = re.compile(
        r"\b(?:hemoglobin|haemoglobin|hb)\s*[:=]?\s*"
        r"([0-9]+(?:\.[0-9]+)?)\s*"
        r"(g\s*/?\s*dL|g/dl)?",
        re.IGNORECASE,
    )

    for match in pattern.finditer(text):

        value = match.group(1)
        unit = match.group(2)

        try:
            numeric_value = float(value)
        except ValueError:
            continue

        # Missing unit is suspicious because the OCR may have
        # failed to recognize the unit.
        if not unit:
            warnings.append(
                _warning(
                    "Hemoglobin",
                    value,
                    "Hemoglobin unit could not be confidently "
                    "identified. Doctor verification required.",
                )
            )
            continue

        # Very unusual values should be reviewed rather than
        # automatically corrected.
        if numeric_value < 5 or numeric_value > 25:

            warnings.append(
                _warning(
                    "Hemoglobin",
                    f"{value} {unit}",
                    "Hemoglobin value appears outside a typical "
                    "clinical range or may contain an OCR error.",
                )
            )

    return warnings


# ---------------------------------------------------------
# Serum Creatinine Validation
# ---------------------------------------------------------

def validate_creatinine(
    text: str,
) -> list[dict[str, Any]]:

    warnings = []

    pattern = re.compile(
        r"\b(?:serum\s+)?creatinine\s*[:=]?\s*"
        r"([0-9]+(?:\.[0-9]+)?)\s*"
        r"(mg\s*/?\s*dL|mg/dl)?",
        re.IGNORECASE,
    )

    for match in pattern.finditer(text):

        value = match.group(1)
        unit = match.group(2)

        try:
            numeric_value = float(value)
        except ValueError:
            continue

        if not unit:

            warnings.append(
                _warning(
                    "Serum Creatinine",
                    value,
                    "Creatinine unit could not be confidently "
                    "identified. Doctor verification required.",
                )
            )

            continue

        if numeric_value < 0.1 or numeric_value > 15:

            warnings.append(
                _warning(
                    "Serum Creatinine",
                    f"{value} {unit}",
                    "Creatinine value appears unusually high "
                    "or may contain an OCR error.",
                )
            )

    return warnings


# ---------------------------------------------------------
# Weight Validation
# ---------------------------------------------------------

def validate_weight(
    text: str,
) -> list[dict[str, Any]]:

    warnings = []

    pattern = re.compile(
        r"\bweight\s*[:=]?\s*"
        r"(.{0,15}?)"
        r"([0-9]+(?:\.[0-9]+)?)\s*"
        r"(kg|kgs|kilograms?)\b",
        re.IGNORECASE,
    )

    for match in pattern.finditer(text):

        prefix = match.group(1).strip()
        value = match.group(2)
        unit = match.group(3)

        try:
            numeric_value = float(value)
        except ValueError:
            continue

        # Characters immediately before a numeric weight can
        # indicate OCR corruption, e.g. "£68 kg".
        suspicious_prefix = bool(
            prefix
            and re.search(r"[^:=\s]", prefix)
        )

        if suspicious_prefix:

            warnings.append(
                _warning(
                    "Weight",
                    f"{prefix}{value} {unit}",
                    "Unexpected characters were detected before "
                    "the weight value. Possible OCR formatting error.",
                )
            )

        elif numeric_value <= 0 or numeric_value > 300:

            warnings.append(
                _warning(
                    "Weight",
                    f"{value} {unit}",
                    "Weight value appears unusual or may contain "
                    "an OCR error.",
                )
            )

    return warnings


# ---------------------------------------------------------
# Generic Unit Validation
# ---------------------------------------------------------

def validate_suspicious_units(
    text: str,
) -> list[dict[str, Any]]:

    warnings = []

    suspicious_patterns = [
        (
            r"\b(?:hemoglobin|haemoglobin|hb)\s*[:=]?\s*"
            r"[0-9]+(?:\.[0-9]+)?\s*g\s*/?\s*dL\b",
            "Hemoglobin",
        ),
        (
            r"\b(?:serum\s+)?creatinine\s*[:=]?\s*"
            r"[0-9]+(?:\.[0-9]+)?\s*mg\s*/?\s*dL\b",
            "Serum Creatinine",
        ),
    ]

    # This function intentionally does not duplicate numeric
    # validation. It is reserved for unit-related checks that
    # can be expanded later.
    #
    # Keeping it separate makes future Bhashini/AI extraction
    # validation easier.

    for pattern, field in suspicious_patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        # Currently numeric validators handle these values.
        # We keep this loop intentionally conservative.
        _ = matches
        _ = field

    return warnings


# ---------------------------------------------------------
# Main Clinical Validation
# ---------------------------------------------------------

def validate_ocr_text(
    ocr_text: str,
) -> dict[str, Any]:
    """
    Validate raw OCR text for potentially suspicious
    clinical values.

    The input OCR text is NEVER modified.
    """

    if not ocr_text or not ocr_text.strip():

        return {
            "status": "no_text",
            "warnings": [],
            "warning_count": 0,
            "requires_doctor_verification": False,
        }

    warnings: list[dict[str, Any]] = []

    warnings.extend(
        validate_hemoglobin(ocr_text)
    )

    warnings.extend(
        validate_creatinine(ocr_text)
    )

    warnings.extend(
        validate_weight(ocr_text)
    )

    warnings.extend(
        validate_suspicious_units(ocr_text)
    )

    return {
        "status": (
            "review_required"
            if warnings
            else "passed"
        ),
        "warnings": warnings,
        "warning_count": len(warnings),
        "requires_doctor_verification": bool(warnings),
    }