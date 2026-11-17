"""Settings, read from environment variables (and backend/.env if present)."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _list(value: str) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _db_path(value: str | None) -> str:
    path = Path(value) if value else BASE_DIR / "instance" / "campus_gate.sqlite3"
    return str(path if path.is_absolute() else BASE_DIR / path)


class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_TRANSCRIBE_MODEL = os.getenv("GEMINI_TRANSCRIBE_MODEL", "gemini-3.5-transcribe")
    GEMINI_EXTRACT_MODEL = os.getenv("GEMINI_EXTRACT_MODEL", "gemini-3.5-flash")
    TRANSCRIBE_MODE = os.getenv("TRANSCRIBE_MODE", "SMART").upper()
    TRANSCRIBE_LANGUAGES = _list(os.getenv("TRANSCRIBE_LANGUAGES", ""))

    DATABASE = _db_path(os.getenv("DATABASE_PATH"))

    # Remote Flask server that confirms a student logged a matching order
    ORDER_VERIFY_URL = os.getenv("ORDER_VERIFY_URL", "")
    ORDER_VERIFY_TOKEN = os.getenv("ORDER_VERIFY_TOKEN", "")
    ORDER_VERIFY_TIMEOUT = float(os.getenv("ORDER_VERIFY_TIMEOUT", "15"))

    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "25")) * 1024 * 1024
    CORS_ORIGINS = _list(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
