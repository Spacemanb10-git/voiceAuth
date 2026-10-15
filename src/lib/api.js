// Thin client for the Flask backend.
//
// Assumed contract (the backend will be built to match):
//   POST /api/transcribe   multipart: audio=<file>          -> { id, transcript }
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
