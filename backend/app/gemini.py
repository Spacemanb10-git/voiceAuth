"""Gemini calls: speech-to-text."""

import io

from flask import current_app
from google import genai
from google.genai import types

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
