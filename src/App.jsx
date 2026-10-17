import { useRef, useState } from 'react'
import CameraFeed from './components/CameraFeed.jsx'
import SpeakButton from './components/SpeakButton.jsx'
import SubmitButton from './components/SubmitButton.jsx'
import { useAudioRecorder } from './hooks/useAudioRecorder.js'
import { submitCheckIn, transcribeAudio } from './lib/api.js'

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

export default function App() {
  const cameraRef = useRef(null)
  const recorder = useAudioRecorder()

  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [recordingId, setRecordingId] = useState(null)
  const [transcribing, setTranscribing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const notify = (type, message) => {
    setToast({ type, message })
    clearTimeout(notify.t)
    notify.t = setTimeout(() => setToast(null), 5000)
  }

  async function handleSpeakToggle() {
    if (!recorder.isRecording) {
      setTranscript('')
      setRecordingId(null)
      setAudioBlob(null)
      await recorder.start()
      return
    }

    const blob = await recorder.stop()
    if (!blob || blob.size === 0) {
      notify('error', 'Nothing was recorded. Try again.')
      return
    }
    setAudioBlob(blob)
    setTranscribing(true)
    try {
      const result = await transcribeAudio(blob)
      setTranscript(result.transcript ?? result.text ?? '')
      setRecordingId(result.id ?? null)
      notify('success', 'Audio transcribed.')
    } catch (err) {
      notify('error', err.message)
    } finally {
      setTranscribing(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const snapshot = await cameraRef.current?.captureFrame()
      await submitCheckIn({ snapshot, transcript, recordingId, audio: audioBlob })
      notify('success', 'Check-in submitted. Agent logged at the gate.')
      setAudioBlob(null)
      setTranscript('')
      setRecordingId(null)
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const hasVoice = Boolean(audioBlob)
  const canSubmit = hasVoice && !recorder.isRecording && !transcribing

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
            <Step n={1} label="Face" done />
            <span className="h-px w-6 bg-white/15" />
            <Step n={2} label="Voice" done={hasVoice} active={!hasVoice} />
            <span className="h-px w-6 bg-white/15" />
            <Step n={3} label="Submit" active={canSubmit} />
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* camera */}
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="eyebrow">Camera</p>
                <h2 className="text-lg font-semibold">Look into the camera</h2>
              </div>
            </div>
            <CameraFeed ref={cameraRef} />
          </section>

          {/* controls */}
          <aside className="glass flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Voice</p>
              <h2 className="text-lg font-semibold">Say your name, company and the drop-off point</h2>
            </div>

            <div className="py-2">
              <SpeakButton
                isRecording={recorder.isRecording}
                isBusy={transcribing}
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

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="eyebrow mb-2">Transcript</p>
              <p className={`min-h-12 text-sm leading-relaxed ${transcript ? 'text-zinc-100' : 'text-zinc-500'}`}>
                {transcribing
                  ? 'Listening back…'
                  : transcript ||
                    (hasVoice ? 'Recording captured — transcript unavailable.' : 'Your words will appear here.')}
              </p>
            </div>

            <div className="mt-auto">
              <SubmitButton onClick={handleSubmit} disabled={!canSubmit} loading={submitting} />
            </div>
          </aside>
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
