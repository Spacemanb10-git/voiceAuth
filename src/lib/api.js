// Clients for the two Flask backends.
//
// 1. Extraction server (audio -> transcript -> entities)
//    POST /api/extract        multipart: audio=<file>
//      -> { id, entities }    entities: { key: value } or [{ label, value }]
//
// 2. Check-in server (stores the gate entry)
//    POST /checkin/submit     multipart: snapshot=<jpeg>, entities=<json>,
//                                        recording_id, captured_at
//      -> { id, status }
//
// In dev, Vite proxies /api to VITE_EXTRACT_BACKEND_URL and /checkin to
// VITE_CHECKIN_BACKEND_URL. Set the *_API_BASE variables to call the servers
// on another origin directly.

const trim = (s) => (s || '').replace(/\/$/, '')
const EXTRACT_BASE = trim(import.meta.env.VITE_EXTRACT_API_BASE)
const CHECKIN_BASE = trim(import.meta.env.VITE_CHECKIN_API_BASE)

async function postForm(url, formData, { signal } = {}) {
  let res
  try {
    res = await fetch(url, { method: 'POST', body: formData, signal })
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

/**
 * Send a recorded audio blob. The server transcribes it and replies with the
 * entities it extracted from the transcript.
 */
export function extractFromAudio(blob, options) {
  const form = new FormData()
  form.append('audio', blob, `recording.${extensionFor(blob.type)}`)
  return postForm(`${EXTRACT_BASE}/api/extract`, form, options)
}

/** Submit the gate check-in: the captured snapshot plus the extracted entities. */
export function submitCheckIn({ snapshot, entities, recordingId }, options) {
  const form = new FormData()
  form.append('snapshot', snapshot, 'snapshot.jpg')
  form.append('entities', JSON.stringify(entities ?? {}))
  if (recordingId != null) form.append('recording_id', String(recordingId))
  form.append('captured_at', new Date().toISOString())
  return postForm(`${CHECKIN_BASE}/checkin/submit`, form, options)
}
