import os

from dotenv import load_dotenv
from openai import OpenAI


# Load variables from backend/.env
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not configured. "
        "Please check backend/.env."
    )


client = OpenAI(api_key=api_key)


def translate_text(
    text: str,
    target_language: str,
) -> str:
    """
    Translate clinical intake text into the selected
    patient language.

    The translation should preserve the original
    medical meaning and should not add medical advice.
    """

    if not text or not text.strip():
        return ""

    prompt = f"""
Translate the following clinical intake text into {target_language}.

Rules:
- Preserve the exact medical meaning.
- Do not add information.
- Do not diagnose the patient.
- Do not give medical advice.
- Use simple, natural language suitable for a patient.
- Keep medical terms understandable.
- Return only the translated text.

Text:
{text}
"""

    response = client.responses.create(
        model="gpt-5.6-luna",
        input=prompt,
    )

    return response.output_text.strip()