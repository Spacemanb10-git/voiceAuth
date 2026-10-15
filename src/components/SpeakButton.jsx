function formatTime(s) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const BARS = 24

function MicIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" strokeLinecap="round" />
    </svg>
  )
}

function StopIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="3" />
    </svg>
  )
}

/**
 * Toggle button: first press starts recording, second press stops it.
 * Shows pulse rings and a live level meter while recording.
 */
export default function SpeakButton({ isRecording, isBusy, level = 0, elapsed = 0, onToggle }) {
  const label = isBusy ? 'Transcribing…' : isRecording ? 'Tap to finish' : 'Speak here'

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid place-items-center">
        {isRecording && (
          <>
            <span className="absolute size-36 animate-ring rounded-full bg-rose/30" />
            <span className="absolute size-36 animate-ring rounded-full bg-rose/20 [animation-delay:0.6s]" />
          </>
        )}

        <button
          type="button"
          onClick={onToggle}
          disabled={isBusy}
          aria-pressed={isRecording}
          aria-label={label}
          style={isRecording ? { transform: `scale(${1 + level * 0.12})` } : undefined}
          className={`relative grid size-36 place-items-center rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime/50 disabled:cursor-wait disabled:opacity-70 ${
            isRecording
              ? 'bg-gradient-to-br from-rose to-orange-400 text-white shadow-[0_0_60px_-5px] shadow-rose/70'
              : 'bg-gradient-to-br from-lime to-cyan text-ink shadow-[0_0_60px_-10px] shadow-lime/60 hover:scale-105 active:scale-95'
          }`}
        >
          {isBusy ? (
            <span className="size-10 animate-spin rounded-full border-[3px] border-ink/20 border-t-ink" />
          ) : isRecording ? (
            <StopIcon className="size-11" />
          ) : (
            <MicIcon className="size-12" />
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-xl font-semibold tracking-tight">{label}</p>
        <p className="mt-1 font-mono text-sm text-zinc-400">
          {isRecording ? (
            <span className="text-rose">● REC {formatTime(elapsed)}</span>
          ) : isBusy ? (
            'Sending audio to the server'
          ) : (
            'Press once to start, again to send'
          )}
        </p>
      </div>

      {/* level meter */}
      <div className="flex h-10 items-center gap-1" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => {
          const centre = 1 - Math.abs(i - BARS / 2) / (BARS / 2)
          const h = isRecording ? 0.15 + level * centre * (0.6 + 0.4 * Math.sin(i * 1.7)) : 0.12
          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-[height] duration-100 ${
                isRecording ? 'bg-rose' : 'bg-white/15'
              }`}
              style={{ height: `${Math.max(8, Math.min(100, h * 100))}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}
