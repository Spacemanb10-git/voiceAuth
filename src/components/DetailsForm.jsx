import { FIELDS } from '../lib/fields.js'

/** Editable check-in details, pre-filled from the extraction server. */
export default function DetailsForm({ values, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60">
      <legend className="label mb-3">Check-in details</legend>

      {FIELDS.map((field) => {
        const id = `field-${field.key}`
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
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 focus:outline-none"
            />
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
