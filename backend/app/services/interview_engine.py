from typing import Any


# -------------------------------------------------------------------
# MediKiosk Adaptive Clinical Interview Engine
# -------------------------------------------------------------------

QUESTION_PATHWAYS = {
    "chest_pain": {
        "display_name": "Chest Pain",
        "fields": [
            {
                "field": "onset",
                "question": "When did the chest pain start?",
                "category": "HPI",
            },
            {
                "field": "location",
                "question": "Where exactly do you feel the pain?",
                "category": "HPI",
            },
            {
                "field": "character",
                "question": (
                    "How would you describe the pain, for example "
                    "pressure, burning, stabbing, or tightness?"
                ),
                "category": "HPI",
            },
            {
                "field": "radiation",
                "question": (
                    "Does the pain spread to another part of your body, "
                    "such as your arm, shoulder, jaw, back, or neck?"
                ),
                "category": "HPI",
            },
            {
                "field": "aggravating_factors",
                "question": (
                    "Does anything make the pain worse, such as walking, "
                    "breathing, eating, or movement?"
                ),
                "category": "HPI",
            },
            {
                "field": "relieving_factors",
                "question": (
                    "Does anything make the pain better, such as resting "
                    "or changing position?"
                ),
                "category": "HPI",
            },
            {
                "field": "associated_symptoms",
                "question": (
                    "Are you experiencing any other symptoms along with "
                    "the chest pain, such as breathlessness, sweating, "
                    "nausea, dizziness, or palpitations?"
                ),
                "category": "HPI",
            },
            {
                "field": "previous_episodes",
                "question": "Have you experienced similar chest pain before?",
                "category": "HPI",
            },
        ],
    },

    "fever": {
        "display_name": "Fever",
        "fields": [
            {
                "field": "onset",
                "question": "When did the fever start?",
                "category": "HPI",
            },
            {
                "field": "duration",
                "question": "How long have you had the fever?",
                "category": "HPI",
            },
            {
                "field": "severity",
                "question": "Do you know the highest temperature you measured?",
                "category": "HPI",
            },
            {
                "field": "associated_symptoms",
                "question": (
                    "Are you experiencing any other symptoms along with "
                    "the fever?"
                ),
                "category": "HPI",
            },
            {
                "field": "previous_episodes",
                "question": "Have you had similar episodes of fever before?",
                "category": "HPI",
            },
        ],
    },

    "abdominal_pain": {
        "display_name": "Abdominal Pain",
        "fields": [
            {
                "field": "onset",
                "question": "When did the abdominal pain start?",
                "category": "HPI",
            },
            {
                "field": "location",
                "question": "Where exactly in your abdomen do you feel the pain?",
                "category": "HPI",
            },
            {
                "field": "character",
                "question": "How would you describe the pain?",
                "category": "HPI",
            },
            {
                "field": "aggravating_factors",
                "question": "Does anything make the pain worse?",
                "category": "HPI",
            },
            {
                "field": "relieving_factors",
                "question": "Does anything make the pain better?",
                "category": "HPI",
            },
            {
                "field": "associated_symptoms",
                "question": (
                    "Do you have any other symptoms such as vomiting, "
                    "diarrhoea, constipation, or loss of appetite?"
                ),
                "category": "HPI",
            },
        ],
    },

    "headache": {
        "display_name": "Headache",
        "fields": [
            {
                "field": "onset",
                "question": "When did the headache start?",
                "category": "HPI",
            },
            {
                "field": "location",
                "question": "Where on your head do you feel the headache?",
                "category": "HPI",
            },
            {
                "field": "character",
                "question": "How would you describe the headache?",
                "category": "HPI",
            },
            {
                "field": "severity",
                "question": "On a scale from 0 to 10, how severe is the headache?",
                "category": "HPI",
            },
            {
                "field": "associated_symptoms",
                "question": (
                    "Do you have any other symptoms such as vomiting, "
                    "vision changes, weakness, dizziness, or sensitivity to light?"
                ),
                "category": "HPI",
            },
            {
                "field": "previous_episodes",
                "question": "Have you experienced similar headaches before?",
                "category": "HPI",
            },
        ],
    },
}


def normalize_complaint(complaint: str) -> str:
    """
    Match common English and supported Indian-language symptom wording
    to a language-neutral interview pathway.
    """

    text = complaint.casefold().strip()

    keyword_pathways = {
        "chest_pain": (
            "chest pain",
            "pain in chest",
            "chest discomfort",
            "सीने में दर्द",
            "छाती में दर्द",
            "छातीत दुखणे",
            "छातीत वेदना",
            "বুকে ব্যথা",
            "மார்பு வலி",
            "ఛాతీ నొప్పి",
        ),
        "fever": (
            "fever",
            "high temperature",
            "बुखार",
            "ताप",
            "ताप आला",
            "জ্বর",
            "காய்ச்சல்",
            "జ్వరం",
        ),
        "abdominal_pain": (
            "abdominal pain",
            "stomach pain",
            "belly pain",
            "पेट में दर्द",
            "पेट दर्द",
            "पोटदुखी",
            "पोटात दुखणे",
            "পেট ব্যথা",
            "வயிற்று வலி",
            "కడుపు నొప్పి",
        ),
        "headache": (
            "headache",
            "head pain",
            "सिरदर्द",
            "सिर में दर्द",
            "सर में दर्द",
            "डोकेदुखी",
            "डोक्यात दुखत आहे",
            "মাথা ব্যথা",
            "தலைவலி",
            "தலையில் வலி",
            "తలనొప్పి",
            "తల నొప్పి",
        ),
    }

    for pathway_key, keywords in keyword_pathways.items():
        if any(keyword in text for keyword in keywords):
            return pathway_key

    return "general"


def get_next_question(
    complaint: str,
    answers: dict[str, Any],
) -> dict[str, Any]:
    """
    Return the next unanswered clinical interview question.
    """

    pathway_key = normalize_complaint(complaint)

    # Unsupported symptom: ask once, save the description, then complete.
    # This prevents the same general question from repeating forever.
    if pathway_key == "general":
        free_text = answers.get("free_text")

        if isinstance(free_text, str) and free_text.strip():
            return {
                "completed": True,
                "question": None,
                "field": None,
                "category": None,
                "pathway": "general",
            }

        return {
            "completed": False,
            "question": "Please describe your main problem in your own words.",
            "field": "free_text",
            "category": "Chief Complaint",
            "pathway": "general",
        }

    pathway = QUESTION_PATHWAYS[pathway_key]

    for item in pathway["fields"]:
        field = item["field"]

        if field not in answers:
            return {
                "completed": False,
                "question": item["question"],
                "field": field,
                "category": item["category"],
                "pathway": pathway_key,
            }

        value = answers[field]

        if value is None:
            return {
                "completed": False,
                "question": item["question"],
                "field": field,
                "category": item["category"],
                "pathway": pathway_key,
            }

        if isinstance(value, str) and not value.strip():
            return {
                "completed": False,
                "question": item["question"],
                "field": field,
                "category": item["category"],
                "pathway": pathway_key,
            }

    return {
        "completed": True,
        "question": None,
        "field": None,
        "category": None,
        "pathway": pathway_key,
    }