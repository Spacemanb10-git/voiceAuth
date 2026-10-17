// Thin client for the Flask backend.
//
// Assumed contract (the backend will be built to match):
//   POST /api/transcribe   multipart: audio=<file>          -> { id, transcript }
//   POST /api/checkin      multipart: snapshot=<jpeg>, transcript,
//                                     recording_id, [audio]      -> { id, status }
//
// In dev, Vite proxies /api to VITE_BACKEND_URL. Set VITE_API_BASE to call a
// backend on another origin directly.

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function postForm(path, formData, { signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error('Could not reach the server. Is the backend running?')
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => ({})) : await res.text()

  if (!res.ok) {
    const message =
      (isJson && (body.error || body.message)) ||
      (typeof body === 'string' && body) ||
      `Request failed (${res.status})`
    throw new Error(message)
  }
  return body
}

function extensionFor(mimeType = '') {
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

/** Send a recorded audio blob for transcription. */
export function transcribeAudio(blob, options) {
  const form = new FormData()
  form.append('audio', blob, `recording.${extensionFor(blob.type)}`)
  return postForm('/api/transcribe', form, options)
}

/** Submit the gate check-in: a camera snapshot plus the transcription result. */
export function submitCheckIn({ snapshot, transcript, recordingId, audio }, options) {
  const form = new FormData()
  if (snapshot) form.append('snapshot', snapshot, 'snapshot.jpg')
  // If transcription failed there is no recording id, so send the audio itself
  if (audio && recordingId == null) {
    form.append('audio', audio, `recording.${extensionFor(audio.type)}`)
  }
  if (transcript) form.append('transcript', transcript)
  if (recordingId != null) form.append('recording_id', String(recordingId))
  form.append('captured_at', new Date().toISOString())
  return postForm('/api/checkin', form, options)
}
