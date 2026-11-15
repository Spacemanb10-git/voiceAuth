import io
import sqlite3

JPEG = b"\xff\xd8\xff\xe0fake-jpeg-bytes\xff\xd9"

VALID_FORM = {
    "agent_name": "Ravi Kumar",
    "agent_mobile": "9876543210",
    "student_name": "Vipul Yadav",
    "app": "Swiggy",
    "hostel": "Hostel 12",
    "aadhaar_number": "234567890123",
    "captured_at": "2026-11-15T10:00:00Z",
}


def submit(client, **overrides):
    data = {**VALID_FORM, **overrides}
    data["snapshot"] = (io.BytesIO(JPEG), "snapshot.jpg", "image/jpeg")
    return client.post("/checkin/submit", data=data, content_type="multipart/form-data")


def rows(app, sql):
    conn = sqlite3.connect(app.config["DATABASE"])
    try:
        return conn.execute(sql).fetchall()
    finally:
        conn.close()


# --- /api/extract ----------------------------------------------------------

def test_health(client):
    body = client.get("/api/health").get_json()
    assert body["status"] == "ok"
    assert body["transcribe_model"] == "gemini-3.5-transcribe"


def test_extract_returns_form_shaped_entities(client):
    res = client.post(
        "/api/extract",
        data={"audio": (io.BytesIO(b"fake-audio"), "recording.webm", "audio/webm")},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["transcript"] == "FAKE TRANSCRIPT"
    assert body["entities"] == {
        "agent_name": "Ravi Kumar",
        "agent_mobile": "9876543210",
        "student_name": "Vipul Yadav",
        "app": "Swiggy",
        "hostel": "Hostel 12",
        "aadhaar_number": "234567890123",
    }
    assert body["id"]


def test_extract_requires_audio(client):
    res = client.post("/api/extract", data={}, content_type="multipart/form-data")
    assert res.status_code == 400
    assert "audio" in res.get_json()["error"]


def test_extract_gemini_failure_is_502(client, monkeypatch):
    from app import gemini

    def boom(audio, mime):
        raise gemini.GeminiError("Transcription failed: quota")

    monkeypatch.setattr(gemini, "transcribe", boom)
    res = client.post(
        "/api/extract",
        data={"audio": (io.BytesIO(b"x"), "r.webm", "audio/webm")},
        content_type="multipart/form-data",
    )
    assert res.status_code == 502
    assert "quota" in res.get_json()["error"]


# --- /checkin/submit -------------------------------------------------------

def test_submit_stores_all_three_tables(client, app):
    res = submit(client)
    assert res.status_code == 201
    body = res.get_json()
    assert body["status"] == "checked_in" and body["returning_agent"] is False

    (photo_id, photo), = rows(app, "SELECT photo_id, photo FROM photo_ids")
    assert photo == JPEG
    (name, aadhaar, mobile, agent_photo), = rows(
        app, "SELECT name, aadhaar_number, mobile_number, photo_id FROM delivery_agents"
    )
    assert (name, aadhaar, mobile, agent_photo) == ("Ravi Kumar", "234567890123", "9876543210", photo_id)
    (order_id, person, app_name, hostel, student), = rows(
        app, "SELECT order_id, delivery_person_id, app, hostel, student_name FROM delivery_orders"
    )
    assert (person, app_name, hostel, student) == (body["agent_id"], "Swiggy", "Hostel 12", "Vipul Yadav")
    assert order_id == body["order_id"]


def test_returning_agent_reuses_row_and_photo_id(client, app):
    first = submit(client).get_json()
    second = submit(client, agent_mobile="+91 91234 56789", hostel="Hostel 3").get_json()

    assert second["returning_agent"] is True
    assert second["agent_id"] == first["agent_id"]
    assert second["photo_id"] == first["photo_id"]
    assert rows(app, "SELECT COUNT(*) FROM photo_ids") == [(1,)]
    assert rows(app, "SELECT mobile_number FROM delivery_agents") == [("9123456789",)]
    assert rows(app, "SELECT COUNT(*) FROM delivery_orders") == [(2,)]


def test_submit_rejects_missing_and_invalid_fields(client, app):
    res = submit(client, student_name="", agent_mobile="12345", aadhaar_number="1234")
    assert res.status_code == 400
    fields = res.get_json()["fields"]
    assert set(fields) == {"student_name", "agent_mobile", "aadhaar_number"}
    assert rows(app, "SELECT COUNT(*) FROM delivery_orders") == [(0,)]


def test_submit_requires_photo(client):
    res = client.post("/checkin/submit", data=VALID_FORM, content_type="multipart/form-data")
    assert res.status_code == 400


def test_photo_must_exist_for_agent(app):
    conn = sqlite3.connect(app.config["DATABASE"])
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.execute(
            "INSERT INTO delivery_agents (name, aadhaar_number, mobile_number, photo_id) "
            "VALUES ('X', '234567890123', '9876543210', 999)"
        )
        raised = False
    except sqlite3.IntegrityError:
        raised = True
    finally:
        conn.close()
    assert raised


def test_orders_list_masks_aadhaar_and_serves_photo(client):
    submit(client)
    orders = client.get("/checkin/orders").get_json()["orders"]
    assert orders[0]["aadhaar_number"] == "XXXX XXXX 0123"
    photo = client.get(orders[0]["photo_url"])
    assert photo.status_code == 200 and photo.data == JPEG
