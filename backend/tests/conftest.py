import pytest

from app import create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    app = create_app(
        {
            "TESTING": True,
            "DATABASE": str(tmp_path / "test.sqlite3"),
            "GEMINI_API_KEY": "test-key",
            "ORDER_VERIFY_URL": "https://verify.example.test/api/verify-order",
        }
    )

    # Never call the real Gemini API in tests
    from app import gemini

    monkeypatch.setattr(gemini, "transcribe", lambda audio, mime: "FAKE TRANSCRIPT")
    monkeypatch.setattr(
        gemini,
        "extract_entities",
        lambda text: {
            "agent_name": "  Ravi Kumar ",
            "agent_mobile": "+91 98765 43210",
            "student_name": "Vipul Yadav",
            "app": "Swiggy",
            "hostel": "Hostel 12",
            "aadhaar_number": "2345 6789 0123",
        },
    )

    # Remote order verification: accept by default, tests can override
    from app.routes import checkin

    app.verify_calls = []

    def fake_verify(order):
        app.verify_calls.append(order)
        return {"status": "accepted", "message": "Order matched"}

    monkeypatch.setattr(checkin, "verify_order", fake_verify)
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()
