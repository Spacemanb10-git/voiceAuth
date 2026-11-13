"""Check-in endpoints: store the agent, their photo and the delivery order."""

from flask import Blueprint, abort, jsonify, request

from ..db import get_db
from ..validation import validate_checkin

bp = Blueprint("checkin", __name__, url_prefix="/checkin")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@bp.post("/submit")
def submit():
    snapshot = request.files.get("snapshot")
    if snapshot is None:
        abort(400, description="No photo was sent (expected form field 'snapshot').")
    photo = snapshot.read()
    if not photo:
        abort(400, description="The photo is empty.")
    mime = snapshot.mimetype or "image/jpeg"
    if mime not in ALLOWED_IMAGE_TYPES:
        abort(415, description=f"Unsupported image type: {mime}")

    values, errors = validate_checkin(request.form)
    if errors:
        return jsonify(error="Please fill in all the fields correctly.", fields=errors), 400

    captured_at = request.form.get("captured_at")
    db = get_db()

    with db:  # one transaction: all three tables or nothing
        agent = db.execute(
            "SELECT agent_id, photo_id FROM delivery_agents WHERE aadhaar_number = ?",
            (values["aadhaar_number"],),
        ).fetchone()

        if agent:
            # Returning agent: refresh their photo and contact details in place,
            # so the photo id stays the one referenced by delivery_agents.
            agent_id, photo_id = agent["agent_id"], agent["photo_id"]
            db.execute(
                "UPDATE photo_ids SET photo = ?, mime_type = ?, captured_at = ?, "
                "created_at = datetime('now') WHERE photo_id = ?",
                (photo, mime, captured_at, photo_id),
            )
            db.execute(
                "UPDATE delivery_agents SET name = ?, mobile_number = ?, updated_at = datetime('now') "
                "WHERE agent_id = ?",
                (values["agent_name"], values["agent_mobile"], agent_id),
            )
        else:
            photo_id = db.execute(
                "INSERT INTO photo_ids (photo, mime_type, captured_at) VALUES (?, ?, ?)",
                (photo, mime, captured_at),
            ).lastrowid
            agent_id = db.execute(
                "INSERT INTO delivery_agents (name, aadhaar_number, mobile_number, photo_id) "
                "VALUES (?, ?, ?, ?)",
                (values["agent_name"], values["aadhaar_number"], values["agent_mobile"], photo_id),
            ).lastrowid

        order_id = db.execute(
            "INSERT INTO delivery_orders (delivery_person_id, app, hostel, student_name) "
            "VALUES (?, ?, ?, ?)",
            (agent_id, values["app"], values["hostel"], values["student_name"]),
        ).lastrowid

    return (
        jsonify(
            id=order_id,
            order_id=order_id,
            agent_id=agent_id,
            photo_id=photo_id,
            returning_agent=bool(agent),
            status="checked_in",
        ),
        201,
    )
