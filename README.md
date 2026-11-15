# VoiceAuth — Campus Gate Entry System

Tracks delivery agents entering the campus. At the gate the agent's photo is captured, they speak
their details into the microphone, Gemini fills in a check-in form from the recording, the guard
checks it and submits.

```
voiceAuth/
  frontend/   Vite + React + Tailwind UI (camera, Speak here, check-in form)
  backend/    Python + Flask + SQLite 3 API (Gemini transcription + extraction, storage)
```

## Run it

```bash
# 1. backend  (http://127.0.0.1:5000)
cd backend
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # add GEMINI_API_KEY
python run.py

# 2. frontend (http://localhost:5173), in a second terminal
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` and `/checkin/*` to the backend, so open
http://localhost:5173 and everything talks to the one Flask server.

See [`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md) for details.
