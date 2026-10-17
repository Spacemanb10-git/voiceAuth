# VoiceAuth — Campus Gate Check-in (Frontend)

Front end for tracking delivery agents entering the campus. Built with **Vite + React + Tailwind CSS v4**.

The screen has three parts:

1. **Live camera feed** – a rounded video panel that streams the webcam directly.
2. **Speak here** – press once to start recording the mic, press again to stop.
   The audio is sent to the backend for transcription right away.
3. **Submit** – grabs a snapshot from the camera and sends it with the transcript
   (or the raw audio if transcription failed) as a check-in.

## Getting started

```bash
npm install
cp .env.example .env     # point VITE_BACKEND_URL at the Flask server
npm run dev              # http://localhost:5173
```

Camera and microphone need a secure context: `localhost` works; for other hosts use HTTPS.

## Backend contract (Flask, to be implemented)

| Method | Path              | Body (multipart/form-data)                                   | Response                 |
| ------ | ----------------- | ------------------------------------------------------------ | ------------------------ |
| POST   | `/api/transcribe` | `audio` (webm/ogg/m4a)                                       | `{ "id", "transcript" }` |
| POST   | `/api/checkin`    | `snapshot` (jpeg), `transcript`, `recording_id`, `captured_at`, optional `audio` | `{ "id", "status" }`     |

Errors should return a non-2xx status with `{ "error": "message" }`; the UI shows it as a toast.

In development Vite proxies `/api/*` to `VITE_BACKEND_URL` (default `http://localhost:5000`), so the
Flask app does not need CORS. Set `VITE_API_BASE` to call a backend on another origin directly.

## Project layout

```
src/
  App.jsx                    page layout and check-in flow
  components/CameraFeed.jsx  live camera, frame capture
  components/SpeakButton.jsx record toggle with level meter
  components/SubmitButton.jsx
  hooks/useAudioRecorder.js  MediaRecorder + input level
  lib/api.js                 calls to the Flask backend
```
