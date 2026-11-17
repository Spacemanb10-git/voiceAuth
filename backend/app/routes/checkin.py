"""Check-in endpoints: store the agent, their photo and the delivery order."""

from flask import Blueprint, Response, abort, jsonify, request

from ..db import get_db
from ..validation import mask_aadhaar, validate_checkin
from ..verification import VerificationError, verify_order

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

    # The order is saved. Before answering the front end, ask the remote
    # verification server whether a student logged an order with these details.
    order = dict(
        db.execute(
            "SELECT order_id, delivery_person_id, app, hostel, student_name, entered_at "
            "FROM delivery_orders WHERE order_id = ?",
            (order_id,),
        ).fetchone()
    )
    order["agent_name"] = values["agent_name"]
    order["agent_mobile"] = values["agent_mobile"]

    saved = dict(
        id=order_id,
        order_id=order_id,
        agent_id=agent_id,
        photo_id=photo_id,
        returning_agent=bool(agent),
    )

    try:
        verdict = verify_order(order)
    except VerificationError as exc:
        return jsonify(error=f"Entry saved (order #{order_id}), but it could not be verified: {exc}", **saved), 502

    return (
        jsonify(
            **saved,
            status=verdict["status"],  # "accepted" | "not_accepted"
            accepted=verdict["status"] == "accepted",
            verification_message=verdict["message"],
        ),
        201,
    )


@bp.get("/orders")
def list_orders():
    """Recent gate entries, newest first. ?limit=50"""
    limit = min(max(request.args.get("limit", 50, type=int), 1), 500)
    rows = get_db().execute(
        """
        SELECT o.order_id, o.app, o.hostel, o.student_name, o.entered_at,
               a.agent_id, a.name AS agent_name, a.mobile_number AS agent_mobile,
               a.aadhaar_number, a.photo_id
        FROM delivery_orders o
        JOIN delivery_agents a ON a.agent_id = o.delivery_person_id
        ORDER BY o.order_id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    orders = []
    for row in rows:
        item = dict(row)
        item["aadhaar_number"] = mask_aadhaar(item["aadhaar_number"])
        item["photo_url"] = f"/checkin/photos/{item['photo_id']}"
        orders.append(item)
    return jsonify(orders=orders)


@bp.get("/photos/<int:photo_id>")
def get_photo(photo_id: int):
    row = get_db().execute(
        "SELECT photo, mime_type FROM photo_ids WHERE photo_id = ?", (photo_id,)
    ).fetchone()
    if row is None:
        abort(404, description="Photo not found.")
    return Response(row["photo"], mimetype=row["mime_type"])
