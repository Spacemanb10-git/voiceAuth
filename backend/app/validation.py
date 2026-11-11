"""Cleaning and validation shared by the extract and check-in endpoints."""

import re

FIELDS = ("agent_name", "agent_mobile", "student_name", "app", "hostel", "aadhaar_number")

LABELS = {
    "agent_name": "Delivery agent name",
    "agent_mobile": "Agent mobile number",
    "student_name": "Student name",
    "app": "App",
    "hostel": "Hostel",
    "aadhaar_number": "Agent Aadhaar number",
}

MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
AADHAAR_RE = re.compile(r"^[2-9]\d{11}$")


def digits(value) -> str:
    return re.sub(r"\D", "", str(value or ""))


def normalise_mobile(value) -> str:
    d = digits(value)
    if len(d) == 12 and d.startswith("91"):
        d = d[2:]
    elif len(d) == 11 and d.startswith("0"):
        d = d[1:]
    return d


def _text(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def clean_entities(raw: dict) -> dict:
    """Tidy model output for the form: trimmed text, digit-only numbers."""
    out = {key: _text(raw.get(key)) for key in FIELDS}
    if out["agent_mobile"]:
        out["agent_mobile"] = normalise_mobile(out["agent_mobile"])
    if out["aadhaar_number"]:
        out["aadhaar_number"] = digits(out["aadhaar_number"])
    return out


def validate_checkin(form) -> tuple[dict, dict]:
    """Return (clean_values, errors). errors is empty when the form is valid."""
    values = clean_entities({key: form.get(key) for key in FIELDS})
    errors = {key: f"{LABELS[key]} is required" for key in FIELDS if not values[key]}

    if "agent_mobile" not in errors and not MOBILE_RE.match(values["agent_mobile"]):
        errors["agent_mobile"] = "Enter a valid 10-digit mobile number"
    if "aadhaar_number" not in errors and not AADHAAR_RE.match(values["aadhaar_number"]):
        errors["aadhaar_number"] = "Aadhaar number must be 12 digits"

    return values, errors


def mask_aadhaar(number: str) -> str:
    return f"XXXX XXXX {number[-4:]}" if number else ""
