# VoiceAuth — Campus Gate Check-in (Frontend)

Front end for tracking delivery agents entering the campus. Built with **Vite + React + Tailwind CSS v4**.

The screen has three parts:

1. **Live camera feed** – a rounded video panel that streams the webcam directly, with a
   **Capture photo** button on the feed to take a snapshot of the delivery agent.
2. **Speak here** – press once to start recording the mic, press again to stop. The audio is
   sent right away to the extraction server, which transcribes it and returns the entities it
   found (name, company, drop-off point, …). These are shown in a table.
3. **Submit check-in** – sends the captured snapshot and the extracted entities to the
   check-in server.

## Getting started

```bash
npm install
cp .env.example .env     # point the two *_BACKEND_URL values at the Flask servers
npm run dev              # http://localhost:5173
```

Camera and microphone need a secure context: `localhost` works; for other hosts use HTTPS.

## Backend contract (two Flask servers, to be implemented)

**Extraction server** (default `http://localhost:5000`)

| Method | Path           | Body (multipart/form-data) | Response                |
| ------ | -------------- | -------------------------- | ----------------------- |
| POST   | `/api/extract` | `audio` (webm/ogg/m4a)     | `{ "id", "entities" }`  |

`entities` can be an object (`{ "name": "Ravi", "company": "Swiggy" }`) or a list
(`[{ "label": "name", "value": "Ravi" }]`); the table renders either.

**Check-in server** (default `http://localhost:5001`)

| Method | Path              | Body (multipart/form-data)                                          | Response             |
| ------ | ----------------- | ------------------------------------------------------------------- | -------------------- |
| POST   | `/checkin/submit` | `snapshot` (jpeg), `entities` (JSON string), `recording_id`, `captured_at` | `{ "id", "status" }` |

Errors should return a non-2xx status with `{ "error": "message" }`; the UI shows it as a toast.

In development Vite proxies `/api/*` to `VITE_EXTRACT_BACKEND_URL` and `/checkin/*` to
`VITE_CHECKIN_BACKEND_URL`, so neither Flask app needs CORS. Set `VITE_EXTRACT_API_BASE` /
`VITE_CHECKIN_API_BASE` to call the servers on another origin directly.

## Project layout

```
src/
  App.jsx                    page layout and check-in flow
  components/CameraFeed.jsx  live camera with capture button
  components/EntitiesTable.jsx table of entities returned by the server
  components/SpeakButton.jsx record toggle with level meter
  components/SubmitButton.jsx
  hooks/useAudioRecorder.js  MediaRecorder + input level
  lib/api.js                 calls to the Flask backend
```
