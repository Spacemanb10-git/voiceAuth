"""Campus Gate Entry System — Flask backend."""

from flask import Flask, jsonify

from . import db
from .config import Config


def create_app(overrides: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    db.init_app(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app
