import { useEffect, useRef, useState } from 'react'
import CameraFeed from './components/CameraFeed.jsx'
import EntitiesTable, { toRows } from './components/EntitiesTable.jsx'
import SpeakButton from './components/SpeakButton.jsx'
import SubmitButton from './components/SubmitButton.jsx'
import { useAudioRecorder } from './hooks/useAudioRecorder.js'
import { extractFromAudio, submitCheckIn } from './lib/api.js'

function Toast({ toast, onClose }) {
  if (!toast) return null
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-white px-4 py-2.5 text-sm shadow-sm ${
        toast.type === 'error' ? 'border-red-200 text-red-600' : 'border-zinc-200 text-zinc-800'
      }`}
    >
      {toast.message}
      <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}

function SnapshotStrip({ snapshot, onClear }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      {snapshot ? (
        <img src={snapshot.url} alt="Captured delivery agent" className="h-12 w-20 rounded-lg object-cover" />
      ) : (
        <div className="h-12 w-20 rounded-lg border border-dashed border-zinc-300" />
      )}
      <p className="flex-1 text-sm text-zinc-500">
        {snapshot
          ? `Photo captured at ${snapshot.at.toLocaleTimeString([], { hour12: false })}`
          : 'No photo yet'}
      </p>
      {snapshot && (
        <button type="button" onClick={onClear} className="text-sm text-zinc-500 hover:text-zinc-900">
          Clear
        </button>
      )}
    </div>
  )
}

export default function App() {
  const recorder = useAudioRecorder()

  const [snapshot, setSnapshot] = useState(null) // { blob, url, at }
  const [extraction, setExtraction] = useState(null) // server response
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(0)

  // free the old preview URL whenever the snapshot changes
  useEffect(() => () => snapshot && URL.revokeObjectURL(snapshot.url), [snapshot])

  const notify = (type, message) => {
    setToast({ type, message })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  function handleCapture(blob) {
    setSnapshot({ blob, url: URL.createObjectURL(blob), at: new Date() })
  }

  async function handleSpeakToggle() {
    if (!recorder.isRecording) {
      setExtraction(null)
      await recorder.start()
      return
    }

    const blob = await recorder.stop()
    if (!blob || blob.size === 0) {
      notify('error', 'Nothing was recorded. Try again.')
      return
    }

    // Second press: send right away; the server replies with extracted entities
    setExtracting(true)
    try {
      const result = await extractFromAudio(blob)
      setExtraction(result)
      notify('success', 'Details extracted from the recording.')
    } catch (err) {
      notify('error', err.message)
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitCheckIn({
        snapshot: snapshot.blob,
        entities: extraction?.entities ?? extraction,
        recordingId: extraction?.id ?? null,
      })
      notify('success', 'Check-in submitted. Agent logged at the gate.')
      setSnapshot(null)
      setExtraction(null)
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const hasPhoto = Boolean(snapshot)
  const hasDetails = toRows(extraction).length > 0
  const canSubmit = hasPhoto && hasDetails && !recorder.isRecording && !extracting

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold tracking-tight">VoiceAuth</h1>
          <p className="text-sm text-zinc-500">Campus gate check-in</p>
        </header>

        <main className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="card p-4">
            <CameraFeed onCapture={handleCapture} />
            <SnapshotStrip snapshot={snapshot} onClear={() => setSnapshot(null)} />
          </section>

          <aside className="card flex flex-col gap-6 p-6">
            <div className="py-2">
              <SpeakButton
                isRecording={recorder.isRecording}
                isBusy={extracting}
                level={recorder.level}
                elapsed={recorder.elapsed}
                onToggle={handleSpeakToggle}
              />
            </div>

            {recorder.error && <p className="text-sm text-red-600">{recorder.error}</p>}

            <EntitiesTable result={extraction} loading={extracting} />

            <div className="mt-auto space-y-2">
              <SubmitButton onClick={handleSubmit} disabled={!canSubmit} loading={submitting} />
              {!canSubmit && !submitting && (
                <p className="text-center text-xs text-zinc-400">
                  {!hasPhoto && !hasDetails
                    ? 'Capture a photo and record the agent to submit'
                    : !hasPhoto
                      ? 'Capture a photo to submit'
                      : 'Record the agent to submit'}
                </p>
              )}
            </div>
          </aside>
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
