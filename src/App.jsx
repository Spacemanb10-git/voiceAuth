import { useEffect, useRef, useState } from 'react'
import CameraFeed from './components/CameraFeed.jsx'
import EntitiesTable, { toRows } from './components/EntitiesTable.jsx'
import SpeakButton from './components/SpeakButton.jsx'
import SubmitButton from './components/SubmitButton.jsx'
import { useAudioRecorder } from './hooks/useAudioRecorder.js'
import { extractFromAudio, submitCheckIn } from './lib/api.js'

function Step({ n, label, done, active }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-6 place-items-center rounded-full font-mono text-[11px] transition-colors ${
          done
            ? 'bg-lime text-ink'
            : active
              ? 'bg-white text-ink'
              : 'border border-white/15 text-zinc-500'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={`text-sm ${done || active ? 'text-zinc-100' : 'text-zinc-500'}`}>{label}</span>
    </div>
  )
}

function Toast({ toast, onClose }) {
  if (!toast) return null
  const tone =
    toast.type === 'error'
      ? 'border-rose/40 bg-rose/10 text-rose'
      : 'border-lime/40 bg-lime/10 text-lime'
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3 text-sm backdrop-blur-xl ${tone}`}
    >
      {toast.message}
      <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}

function SnapshotStrip({ snapshot, onClear }) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
      {snapshot ? (
        <img
          src={snapshot.url}
          alt="Captured delivery agent"
          className="h-16 w-28 rounded-xl object-cover ring-1 ring-lime/50"
        />
      ) : (
        <div className="grid h-16 w-28 place-items-center rounded-xl border border-dashed border-white/15 font-mono text-[10px] text-zinc-500">
          NO PHOTO
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">
          {snapshot ? 'Photo captured' : 'Capture a photo of the agent'}
        </p>
        <p className="text-xs text-zinc-400">
          {snapshot
            ? `Taken at ${snapshot.at.toLocaleTimeString([], { hour12: false })} · press Capture again to retake`
            : 'Use the Capture photo button on the camera feed'}
        </p>
      </div>
      {snapshot && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
        >
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
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] animate-blob rounded-full bg-lime/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 size-[560px] animate-blob rounded-full bg-cyan/15 blur-[140px] [animation-delay:-6s]" />

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        {/* header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="size-10" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Voice<span className="bg-gradient-to-r from-lime to-cyan bg-clip-text text-transparent">Auth</span>
              </h1>
              <p className="eyebrow">Campus gate · delivery check-in</p>
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 backdrop-blur-md">
            <Step n={1} label="Photo" done={hasPhoto} active={!hasPhoto} />
            <span className="h-px w-6 bg-white/15" />
            <Step n={2} label="Voice" done={hasDetails} active={hasPhoto && !hasDetails} />
            <span className="h-px w-6 bg-white/15" />
            <Step n={3} label="Submit" active={canSubmit} />
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* camera */}
          <section>
            <div className="mb-3">
              <p className="eyebrow">Camera</p>
              <h2 className="text-lg font-semibold">Look into the camera</h2>
            </div>
            <CameraFeed onCapture={handleCapture} />
            <SnapshotStrip snapshot={snapshot} onClear={() => setSnapshot(null)} />
          </section>

          {/* controls */}
          <aside className="glass flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Voice</p>
              <h2 className="text-lg font-semibold">Say your name, company and the drop-off point</h2>
            </div>

            <div className="py-1">
              <SpeakButton
                isRecording={recorder.isRecording}
                isBusy={extracting}
                level={recorder.level}
                elapsed={recorder.elapsed}
                onToggle={handleSpeakToggle}
              />
            </div>

            {recorder.error && (
              <p className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-2 text-sm text-rose">
                {recorder.error}
              </p>
            )}

            <EntitiesTable result={extraction} loading={extracting} />

            <div className="mt-auto space-y-2">
              <SubmitButton onClick={handleSubmit} disabled={!canSubmit} loading={submitting} />
              {!canSubmit && !submitting && (
                <p className="text-center text-xs text-zinc-500">
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
