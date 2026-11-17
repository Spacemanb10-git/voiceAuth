export default function SubmitButton({ onClick, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
    >
      {loading ? 'Verifying…' : 'Submit check-in'}
    </button>
  )
}
