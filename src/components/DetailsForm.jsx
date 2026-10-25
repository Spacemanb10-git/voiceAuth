import { FIELDS } from '../lib/fields.js'

/** Editable check-in details, pre-filled from the extraction server. */
export default function DetailsForm({ values, errors = {}, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60">
      <legend className="label mb-3">Check-in details</legend>

      {FIELDS.map((field) => {
        const id = `field-${field.key}`
        const error = errors[field.key]
        return (
          <div key={field.key}>
            <label htmlFor={id} className="mb-1 block text-sm text-zinc-700">
              {field.label}
            </label>
            <input
              id={id}
              name={field.key}
              type="text"
              inputMode={field.inputMode}
              autoComplete="off"
              list={field.suggestions ? `${id}-list` : undefined}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:outline-none ${
                error
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                  : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100'
              }`}
            />
            {error && (
              <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
                {error}
              </p>
            )}
            {field.suggestions && (
              <datalist id={`${id}-list`}>
                {field.suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
