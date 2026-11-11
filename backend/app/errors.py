"""Return every error as JSON: { "error": "message" } (the front end shows it)."""

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .gemini import GeminiError


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException):
        message = exc.description
        if exc.code == 413:
            limit = app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
            message = f"Upload is too large (limit {limit} MB)."
        return jsonify(error=message), exc.code

    @app.errorhandler(GeminiError)
    def gemini_error(exc: GeminiError):
        return jsonify(error=str(exc)), 502

    @app.errorhandler(Exception)
    def unexpected(exc: Exception):
        app.logger.exception("Unhandled error")
        return jsonify(error="Something went wrong on the server."), 500
