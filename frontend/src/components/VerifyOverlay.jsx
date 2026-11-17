/**
 * Full-screen overlay shown after Submit:
 *  - while waiting: a revolving spinner
 *  - once the server answers: Accepted / Not accepted
 */

function Spinner() {
  return (
    <div className="relative size-16" role="progressbar" aria-label="Waiting for verification">
      <span className="absolute inset-0 rounded-full border-4 border-zinc-200" />
      <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-zinc-900" />
      {/* small dot orbiting the ring */}
      <span className="absolute inset-0 animate-spin [animation-duration:1.6s] [animation-direction:reverse]">
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-zinc-900" />
      </span>
    </div>
  )
}

export default function VerifyOverlay({ waiting, result, onClose }) {
  if (!waiting && !result) return null

  const accepted = result?.status === 'accepted'

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-900/30 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg"
      >
        {waiting ? (
          <div className="flex flex-col items-center gap-5">
            <Spinner />
            <div>
              <p className="font-medium">Verifying order…</p>
              <p className="mt-1 text-sm text-zinc-500">
                Checking with the student's order records. This can take a few seconds.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <span
              className={`grid size-16 place-items-center rounded-full text-3xl ${
                accepted ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
              aria-hidden="true"
            >
              {accepted ? '✓' : '✕'}
            </span>
            <div>
              <p className={`text-xl font-semibold ${accepted ? 'text-emerald-700' : 'text-red-700'}`}>
                {accepted ? 'Accepted' : 'Not accepted'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {accepted
                  ? 'A matching order was found. The agent may enter.'
                  : 'No matching order was found for these details.'}
              </p>
              {result.message && <p className="mt-2 text-sm text-zinc-700">{result.message}</p>}
              {result.orderId != null && (
                <p className="mt-3 font-mono text-xs text-zinc-400">Entry #{result.orderId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="mt-2 w-full rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              {accepted ? 'Next entry' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
