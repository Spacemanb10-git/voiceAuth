# VoiceAuth — Campus Gate Check-in (Frontend)

Front end for tracking delivery agents entering the campus. Built with **Vite + React + Tailwind CSS v4**, with a minimal light UI.

The screen has three parts:

1. **Live camera feed** – a rounded video panel that streams the webcam directly, with a
   **Capture photo** button on the feed to take a snapshot of the delivery agent.
2. **Speak here** – press once to start recording the mic, press again to stop. The audio is
   sent right away to the extraction server, which transcribes it and returns the entities it
   found. After the first recording an editable **check-in form** appears, pre-filled from the
   response: delivery agent name, agent mobile number, student name, app, hostel and agent
   Aadhaar number. Anything the server missed can be typed in or corrected.
3. **Submit check-in** – checks that a photo was captured and that every form field is filled
   (mobile must be a valid 10-digit number, Aadhaar 12 digits), then sends the snapshot and the
   form to the backend. A spinner overlay stays up while the backend verifies the order with the
   remote order server, then shows **Accepted** or **Not accepted**.

## Getting started

```bash
npm install
cp .env.example .env     # defaults to the Flask backend on http://localhost:5000
npm run dev              # http://localhost:5173
```

Camera and microphone need a secure context: `localhost` works; for other hosts use HTTPS.

## Backend contract

Implemented by the Flask app in [`../backend`](../backend), which serves both route groups on one port.

**Extraction** (`/api`)

| Method | Path           | Body (multipart/form-data) | Response                |
| ------ | -------------- | -------------------------- | ----------------------- |
| POST   | `/api/extract` | `audio` (webm/ogg/m4a)     | `{ "id", "entities" }`  |

`entities` can be an object (`{ "agent_name": "Ravi", "app": "Swiggy" }`) or a list
(`[{ "label": "agent_name", "value": "Ravi" }]`). Keys are matched to form fields by name, with
common aliases accepted (see `src/lib/fields.js`):

| Form field        | Preferred key    | Also accepted                                   |
| ----------------- | ---------------- | ----------------------------------------------- |
| Delivery agent    | `agent_name`     | `name`, `delivery_agent_name`, `agent`          |
| Agent mobile      | `agent_mobile`   | `mobile`, `phone`, `mobile_number`, `contact`   |
| Student name      | `student_name`   | `student`, `recipient`, `customer_name`         |
| App               | `app`            | `delivery_app`, `platform`, `company`           |
| Hostel            | `hostel`         | `hostel_name`, `drop_off_point`, `destination`  |
| Agent Aadhaar     | `aadhaar_number` | `aadhaar`, `aadhar`, `uid`                      |

**Check-in** (`/checkin`)

| Method | Path              | Body (multipart/form-data)                                          | Response             |
| ------ | ----------------- | ------------------------------------------------------------------- | -------------------- |
| POST   | `/checkin/submit` | `snapshot` (jpeg), `agent_name`, `agent_mobile`, `student_name`, `app`, `hostel`, `aadhaar_number`, `recording_id`, `captured_at` | `{ "id", "order_id", "status": "accepted" \| "not_accepted", "verification_message" }` |

Mobile is sent as 10 digits (country code stripped) and Aadhaar as 12 digits without spaces.

Errors should return a non-2xx status with `{ "error": "message" }`; the UI shows it as a toast.

In development Vite proxies `/api/*` to `VITE_EXTRACT_BACKEND_URL` (default
`http://localhost:5000`) and `/checkin/*` to `VITE_CHECKIN_BACKEND_URL` (defaults to the same server). Set `VITE_EXTRACT_API_BASE` /
`VITE_CHECKIN_API_BASE` to call the servers on another origin directly.

## Project layout

```
src/
  App.jsx                    page layout and check-in flow
  components/CameraFeed.jsx  live camera with capture button
  components/DetailsForm.jsx editable check-in form
  components/SpeakButton.jsx record toggle with level meter
  components/SubmitButton.jsx
  components/VerifyOverlay.jsx waiting spinner and Accepted / Not accepted result
  hooks/useAudioRecorder.js  MediaRecorder + input level
  lib/api.js                 calls to the Flask backends
  lib/fields.js              form fields, response mapping, validation
```
