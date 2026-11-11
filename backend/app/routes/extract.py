"""POST /api/extract — audio in, form fields out."""

import uuid

from flask import Blueprint, abort, current_app, jsonify, request

from .. import gemini
from ..validation import clean_entities

bp = Blueprint("extract", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    cfg = current_app.config
    return jsonify(
        status="ok",
        transcribe_model=cfg["GEMINI_TRANSCRIBE_MODEL"],
        extract_model=cfg["GEMINI_EXTRACT_MODEL"],
        gemini_key_set=bool(cfg["GEMINI_API_KEY"]),
    )


@bp.post("/extract")
def extract():
    upload = request.files.get("audio")
    if upload is None:
        abort(400, description="No audio file was sent (expected form field 'audio').")

    audio = upload.read()
    if not audio:
        abort(400, description="The audio file is empty.")

    mime = upload.mimetype or upload.content_type
    if mime and not mime.startswith(("audio/", "video/webm", "application/octet-stream")):
        abort(415, description=f"Unsupported audio type: {mime}")

    # 1. speech -> text (Gemini 3.5 Transcribe)
    transcript = gemini.transcribe(audio, mime)
    # 2. text -> form fields (Gemini, JSON schema)
    entities = clean_entities(gemini.extract_entities(transcript))

    return jsonify(id=uuid.uuid4().hex, transcript=transcript, entities=entities)
