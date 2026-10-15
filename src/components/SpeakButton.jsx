function MicIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" strokeLinecap="round" />
    </svg>
  )
}

/** Toggle button: first press starts recording, second press stops it. */
export default function SpeakButton({ isRecording, isBusy, onToggle }) {
  const label = isBusy ? 'Transcribing…' : isRecording ? 'Tap to finish' : 'Speak here'

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onToggle}
        disabled={isBusy}
        aria-pressed={isRecording}
        className={`grid size-36 place-items-center rounded-full transition-all disabled:opacity-70 ${
          isRecording ? 'bg-rose text-white' : 'bg-gradient-to-br from-lime to-cyan text-ink'
        }`}
      >
        <MicIcon className="size-12" />
      </button>
      <p className="text-xl font-semibold tracking-tight">{label}</p>
    </div>
  )
}
