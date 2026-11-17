# Campus Gate Entry System — Backend

Python + Flask + SQLite 3 backend for the VoiceAuth front end.

1. **`POST /api/extract`**: receives the agent's voice recording, transcribes it with
   **Gemini 3.5 Transcribe** (`gemini-3.5-transcribe`) and asks a second Gemini model
   (`gemini-3.5-flash`, structured JSON output) to pull out the check-in form fields.
2. **`POST /checkin/submit`**: receives the front end's Submit (photo + form), stores it in
   SQLite, then asks a **remote order-verification server** whether a student logged a matching
   order, and only then replies to the front end with `accepted` / `not_accepted`.

## Setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then put your GEMINI_API_KEY in .env
python run.py               # http://127.0.0.1:5000
```

The database file (`instance/campus_gate.sqlite3`) and its tables are created automatically on
start. To create them by hand: `flask --app run init-db`.

Run the tests (Gemini is mocked, no key needed): `python -m pytest -q`

## API

### `POST /api/extract`
multipart/form-data: `audio` (webm / ogg / m4a / wav / mp3)

```json
{
  "id": "6f1c…",
  "transcript": "Hi, I'm Ravi Kumar from Swiggy, order for Vipul Yadav in hostel 12 …",
  "entities": {
    "agent_name": "Ravi Kumar",
    "agent_mobile": "9876543210",
    "student_name": "Vipul Yadav",
    "app": "Swiggy",
    "hostel": "Hostel 12",
    "aadhaar_number": "234567890123"
  }
}
```

The `entities` keys match the front-end form exactly. Fields that were not said come back as `""`.
Mobile numbers are returned as 10 digits and Aadhaar as 12 digits.

### `POST /checkin/submit`
multipart/form-data: `snapshot` (jpeg/png/webp), `agent_name`, `agent_mobile`, `student_name`,
`app`, `hostel`, `aadhaar_number`, optional `captured_at`, `recording_id`.

Flow: save photo, agent and order (one transaction) → POST the order to `ORDER_VERIFY_URL` →
wait for its answer → reply.

`201` → `{ "id", "order_id", "agent_id", "photo_id", "returning_agent", "status": "accepted" | "not_accepted", "accepted": true|false, "verification_message" }`

`502` → the entry was saved but the verification server could not be reached or replied with
something unexpected: `{ "error": "Entry saved (order #7), but it could not be verified: …", "order_id": 7, … }`

`400` → `{ "error": "...", "fields": { "agent_mobile": "Enter a valid 10-digit mobile number" } }`

An agent is identified by Aadhaar number. When the same agent comes again, their row is reused:
name, mobile and photo are refreshed (the photo keeps the same `photo_id`) and a new order is added.

### Remote order-verification server (not part of this repo)

Another Flask server, on a different machine, that holds the orders students have registered.
For every check-in this backend sends:

```http
POST <ORDER_VERIFY_URL>
Content-Type: application/json
Authorization: Bearer <ORDER_VERIFY_TOKEN>      (only if set)

{
  "order_id": 7,
  "delivery_person_id": 3,
  "agent_name": "Ravi Kumar",
  "agent_mobile": "9876543210",
  "app": "Swiggy",
  "hostel": "Hostel 12",
  "student_name": "Vipul Yadav",
  "entered_at": "2026-11-17 09:41:12"
}
```

and expects `{ "status": "accepted" }` when a student has an order with these details, otherwise
`{ "status": "not_accepted" }`, optionally with a `"message"`. `{"accepted": true|false}` also works,
as does a `404` with `{"status": "not_found"}`. The Aadhaar number is never sent. The request times
out after `ORDER_VERIFY_TIMEOUT` seconds (default 15); use an `https://` URL since it leaves this machine.

### Other endpoints
- `GET /api/health`: status and configured models
- `GET /checkin/orders?limit=50`: recent entries joined with agent details (Aadhaar masked)
- `GET /checkin/photos/<photo_id>`: the stored photo

Errors are always JSON: `{ "error": "message" }`. Gemini failures return `502`.

## Database (SQLite 3)

| Table             | Columns                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `photo_ids`       | `photo_id` (PK), `photo` (BLOB), `mime_type`, `captured_at`, `created_at`                 |
| `delivery_agents` | `agent_id` (PK), `name`, `aadhaar_number` (unique), `mobile_number`, `photo_id` → `photo_ids`, `created_at`, `updated_at` |
| `delivery_orders` | `order_id` (PK), `delivery_person_id` → `delivery_agents`, `app`, `hostel`, `student_name`, `entered_at` |

Foreign keys are enforced (`PRAGMA foreign_keys = ON`): an agent cannot reference a photo that does not
exist, and an order cannot reference an agent that does not exist. The three inserts for a check-in run
in a single transaction.

> Aadhaar numbers are stored in plain text so they can be looked up. Keep the database file private
> and out of git (it is ignored by `.gitignore`).

## Configuration (`.env`)

| Variable                  | Default                 | Notes                                         |
| ------------------------- | ----------------------- | --------------------------------------------- |
| `GEMINI_API_KEY`          | —                       | required                                      |
| `GEMINI_TRANSCRIBE_MODEL` | `gemini-3.5-transcribe` |                                               |
| `GEMINI_EXTRACT_MODEL`    | `gemini-3.5-flash`      | any Gemini model with JSON-schema output      |
| `TRANSCRIBE_MODE`         | `SMART`                 | or `VERBATIM`                                 |
| `TRANSCRIBE_LANGUAGES`    | auto-detect             | e.g. `en-IN,hi-IN`                            |
| `DATABASE_PATH`           | `instance/campus_gate.sqlite3` |                                        |
| `MAX_UPLOAD_MB`           | `25`                    |                                               |
| `ORDER_VERIFY_URL`        | —                       | required; remote verification endpoint        |
| `ORDER_VERIFY_TOKEN`      | —                       | optional bearer token for that server         |
| `ORDER_VERIFY_TIMEOUT`    | `15`                    | seconds                                       |
| `CORS_ORIGINS`            | `http://localhost:5173` | only needed when not using the Vite proxy     |
| `HOST` / `PORT`           | `127.0.0.1` / `5000`    |                                               |
