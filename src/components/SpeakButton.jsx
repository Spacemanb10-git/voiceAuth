function formatTime(s) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function MicIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Toggle button: first press starts recording, second press stops it.
 */
export default function SpeakButton({ isRecording, isBusy, level = 0, elapsed = 0, onToggle }) {
  const label = isBusy ? 'Processing…' : isRecording ? 'Tap to finish' : 'Speak here'

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={isBusy}
        aria-pressed={isRecording}
        aria-label={label}
        className={`grid size-20 place-items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${
          isRecording
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-zinc-900 text-white hover:bg-zinc-700'
        }`}
      >
        {isBusy ? (
          <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : isRecording ? (
          <span className="size-6 rounded-md bg-white" />
        ) : (
          <MicIcon className="size-8" />
        )}
      </button>

      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {isRecording
            ? <span className="font-mono">{formatTime(elapsed)}</span>
            : isBusy
              ? 'Extracting details from your audio'
              : 'Press once to start, again to send'}
        </p>
      </div>

      {/* thin level bar while recording */}
      <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-red-500 transition-[width] duration-100"
          style={{ width: isRecording ? `${Math.max(4, level * 100)}%` : '0%' }}
        />
      </div>
    </div>
  )
}
