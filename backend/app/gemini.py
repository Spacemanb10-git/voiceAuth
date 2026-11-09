"""Gemini calls: speech-to-text, then structured extraction of the form fields."""

import io

from flask import current_app
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

# Clips up to this size are sent inline; larger ones go through the Files API.
INLINE_AUDIO_LIMIT = 15 * 1024 * 1024

KNOWN_APPS = [
    "Swiggy", "Zomato", "Blinkit", "Zepto", "Amazon", "Flipkart",
    "Swiggy Instamart", "BigBasket", "Dunzo",
]

# Words the transcriber should spell correctly
VOCABULARY = KNOWN_APPS + ["Aadhaar", "IIT Bombay", "Powai", "hostel", "Tansa House"]


class GeminiError(RuntimeError):
    """Raised when a Gemini call fails or returns something unusable."""


class CheckInEntities(BaseModel):
    """The exact JSON shape the front end's check-in form expects."""

    agent_name: str = Field(
        "", description="Full name of the delivery agent (usually the speaker). Empty string if not said."
    )
    agent_mobile: str = Field(
        "", description="Delivery agent's mobile number as digits only, without +91 or spaces. Empty string if not said."
    )
    student_name: str = Field(
        "", description="Name of the student the order is for. Empty string if not said."
    )
    app: str = Field(
        "",
        description="Delivery app or company, using the usual spelling, e.g. "
        + ", ".join(KNOWN_APPS)
        + ". Empty string if not said.",
    )
    hostel: str = Field(
        "", description='Hostel the order is going to, written as "Hostel <number>" when a number is said, '
        'otherwise the hostel name as said. Empty string if not said.'
    )
    aadhaar_number: str = Field(
        "", description="Delivery agent's 12-digit Aadhaar number as digits only. Empty string if not said."
    )


EXTRACTION_PROMPT = """\
You fill in a gate-entry form at the IIT Bombay campus. A delivery agent has \
spoken to a microphone at the gate, possibly in English, Hindi or a mix of both. \
Below is the transcript of what they said.

Extract these fields:
- agent_name: the delivery agent's own name
- agent_mobile: the agent's mobile number
- student_name: the student who ordered
- app: the delivery app / company
- hostel: the hostel the delivery is for
- aadhaar_number: the agent's Aadhaar number

Rules:
- Use only what is in the transcript. Never guess or invent a value; use "" when a field is missing.
- Numbers may be spoken as words or in groups ("nine eight seven six…", "double five"); write them as digits.
- Write names in Title Case in English letters.

Transcript:
<<<
{transcript}
>>>
"""


def _client() -> genai.Client:
    client = current_app.extensions.get("gemini_client")
    if client is None:
        key = current_app.config.get("GEMINI_API_KEY")
        if not key:
            raise GeminiError("GEMINI_API_KEY is not set on the server.")
        client = genai.Client(api_key=key)
        current_app.extensions["gemini_client"] = client
    return client


def transcribe(audio: bytes, mime_type: str | None) -> str:
    """Send an audio clip to Gemini 3.5 Transcribe and return the transcript text."""
    cfg = current_app.config
    client = _client()
    # Browsers send e.g. "audio/webm;codecs=opus"; Gemini wants the bare type
    mime = (mime_type or "audio/webm").split(";")[0].strip() or "audio/webm"

    try:
        if len(audio) <= INLINE_AUDIO_LIMIT:
            audio_part = types.Part.from_bytes(data=audio, mime_type=mime)
        else:
            audio_part = client.files.upload(file=io.BytesIO(audio), config={"mime_type": mime})

        transcription = types.AudioTranscriptionConfig(
            mode=cfg["TRANSCRIBE_MODE"],
            custom_vocabulary=VOCABULARY,
            **({"language_codes": cfg["TRANSCRIBE_LANGUAGES"]} if cfg["TRANSCRIBE_LANGUAGES"] else {}),
        )
        response = client.models.generate_content(
            model=cfg["GEMINI_TRANSCRIBE_MODEL"],
            contents=[audio_part],
            config=types.GenerateContentConfig(audio_transcription_config=transcription),
        )
    except GeminiError:
        raise
    except Exception as exc:  # network / API errors from the SDK
        current_app.logger.exception("Transcription failed")
        raise GeminiError(f"Transcription failed: {exc}") from exc

    return (response.text or "").strip()


def extract_entities(transcript: str) -> dict:
    """Ask Gemini to pull the form fields out of the transcript as JSON."""
    if not transcript.strip():
        return CheckInEntities().model_dump()

    try:
        response = _client().models.generate_content(
            model=current_app.config["GEMINI_EXTRACT_MODEL"],
            contents=EXTRACTION_PROMPT.format(transcript=transcript),
            config={
                "response_mime_type": "application/json",
                "response_json_schema": CheckInEntities.model_json_schema(),
            },
        )
    except GeminiError:
        raise
    except Exception as exc:
        current_app.logger.exception("Entity extraction failed")
        raise GeminiError(f"Entity extraction failed: {exc}") from exc

    try:
        return CheckInEntities.model_validate_json(response.text or "{}").model_dump()
    except ValidationError as exc:
        raise GeminiError("The extraction model returned malformed JSON.") from exc
