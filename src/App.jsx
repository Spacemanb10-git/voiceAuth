import { useRef, useState } from 'react'
import CameraFeed from './components/CameraFeed.jsx'
import SpeakButton from './components/SpeakButton.jsx'
import { useAudioRecorder } from './hooks/useAudioRecorder.js'
import { transcribeAudio } from './lib/api.js'

export default function App() {
  const cameraRef = useRef(null)
  const recorder = useAudioRecorder()

  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState('')

  async function handleSpeakToggle() {
    if (!recorder.isRecording) {
      setTranscript('')
      setError('')
      await recorder.start()
      return
    }
    const blob = await recorder.stop()
    if (!blob || blob.size === 0) return
    setTranscribing(true)
    try {
      const result = await transcribeAudio(blob)
      setTranscript(result.transcript ?? result.text ?? '')
    } catch (err) {
      setError(err.message)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] animate-blob rounded-full bg-lime/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 size-[560px] animate-blob rounded-full bg-cyan/15 blur-[140px] [animation-delay:-6s]" />

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Voice<span className="bg-gradient-to-r from-lime to-cyan bg-clip-text text-transparent">Auth</span>
            </h1>
            <p className="eyebrow">Campus gate · delivery check-in</p>
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <p className="eyebrow">Camera</p>
            <h2 className="mb-3 text-lg font-semibold">Look into the camera</h2>
            <CameraFeed ref={cameraRef} />
          </section>

          <aside className="glass flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Voice</p>
              <h2 className="text-lg font-semibold">Say your name, company and the drop-off point</h2>
            </div>
            <SpeakButton
              isRecording={recorder.isRecording}
              isBusy={transcribing}
              level={recorder.level}
              elapsed={recorder.elapsed}
              onToggle={handleSpeakToggle}
            />
            {(recorder.error || error) && (
              <p className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-2 text-sm text-rose">
                {recorder.error || error}
              </p>
            )}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="eyebrow mb-2">Transcript</p>
              <p className="min-h-12 text-sm text-zinc-300">
                {transcribing ? 'Listening back…' : transcript || 'Your words will appear here.'}
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
