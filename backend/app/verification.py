"""Ask the remote order-verification server whether a student logged this order.

The remote server is another Flask app (not on this machine). We POST the order
details as JSON; it replies whether a matching order exists:

    -> { "order_id": 7, "delivery_person_id": 3, "agent_name": "...", "agent_mobile": "...",
         "app": "Swiggy", "hostel": "Hostel 12", "student_name": "...", "entered_at": "..." }
    <- { "status": "accepted" | "not_accepted", "message": "optional text" }

`{"accepted": true/false}` is understood too.
"""

import requests
from flask import current_app

ACCEPTED = {"accepted", "accept", "matched", "match", "found", "ok", "true", "yes", "approved"}
NOT_ACCEPTED = {
    "not_accepted", "notaccepted", "rejected", "reject", "denied", "not_found", "notfound",
    "no_match", "unmatched", "mismatch", "false", "no",
}


class VerificationError(RuntimeError):
    """The verification server could not be reached or gave an unusable reply."""


def _parse_status(body: dict) -> str | None:
    raw = body.get("status", body.get("result", body.get("accepted")))
    if isinstance(raw, bool):
        return "accepted" if raw else "not_accepted"
    if raw is None:
        return None
    word = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
    if word in ACCEPTED:
        return "accepted"
    if word in NOT_ACCEPTED:
        return "not_accepted"
    return None


def verify_order(order: dict) -> dict:
    """Return {"status": "accepted" | "not_accepted", "message": str}."""
    cfg = current_app.config
    url = cfg.get("ORDER_VERIFY_URL")
    if not url:
        raise VerificationError("ORDER_VERIFY_URL is not set on the server.")

    headers = {"Accept": "application/json"}
    if cfg.get("ORDER_VERIFY_TOKEN"):
        headers["Authorization"] = f"Bearer {cfg['ORDER_VERIFY_TOKEN']}"

    try:
        res = requests.post(url, json=order, headers=headers, timeout=cfg["ORDER_VERIFY_TIMEOUT"])
    except requests.Timeout as exc:
        raise VerificationError("The order verification server did not respond in time.") from exc
    except requests.RequestException as exc:
        current_app.logger.warning("Order verification request failed: %s", exc)
        raise VerificationError("Could not reach the order verification server.") from exc

    try:
        body = res.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        body = {}

    status = _parse_status(body)
    # A 4xx that still says "not_found"/"rejected" is a valid answer; anything else is a failure
    if status is None or res.status_code >= 500:
        raise VerificationError(
            f"The order verification server gave an unexpected reply (HTTP {res.status_code})."
        )

    message = body.get("message") or body.get("reason") or body.get("detail") or ""
    return {"status": status, "message": str(message)}
