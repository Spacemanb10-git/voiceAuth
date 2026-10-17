function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SubmitButton({ onClick, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative w-full overflow-hidden rounded-2xl bg-white px-6 py-4 text-base font-semibold text-ink transition-all hover:shadow-[0_0_40px_-8px] hover:shadow-lime/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500 disabled:shadow-none"
    >
      {/* sheen on hover */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-lime/40 to-transparent transition-transform duration-700 group-hover:translate-x-full group-disabled:hidden" />
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
            Submitting…
          </>
        ) : (
          <>
            Submit check-in
            <ArrowIcon className="size-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  )
}
