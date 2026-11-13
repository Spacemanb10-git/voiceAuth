"""Campus Gate Entry System — Flask backend."""

from flask import Flask
from flask_cors import CORS

from . import db
from .config import Config
from .errors import register_error_handlers
from .routes import checkin, extract


def create_app(overrides: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    CORS(app, origins=app.config["CORS_ORIGINS"])
    db.init_app(app)
    register_error_handlers(app)

    app.register_blueprint(extract.bp)
    app.register_blueprint(checkin.bp)
    return app
