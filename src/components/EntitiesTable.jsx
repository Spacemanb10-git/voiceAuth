// Renders whatever the extraction server returned as a clean two-column table.
// Accepts either { key: value } or [{ label|type|entity, value|text }].

const HIDDEN_KEYS = new Set(['id', 'status', 'recording_id'])

function prettyKey(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function toRows(result) {
  if (!result) return []
  const source = result.entities ?? result
  if (Array.isArray(source)) {
    return source.map((item, i) => ({
      key: prettyKey(item.label ?? item.type ?? item.entity ?? item.key ?? `Item ${i + 1}`),
      value: formatValue(item.value ?? item.text ?? item.word ?? item),
    }))
  }
  if (typeof source === 'object') {
    return Object.entries(source)
      .filter(([k]) => !HIDDEN_KEYS.has(k))
      .map(([k, v]) => ({ key: prettyKey(k), value: formatValue(v) }))
  }
  return [{ key: 'Result', value: formatValue(source) }]
}

export default function EntitiesTable({ result, loading }) {
  const rows = toRows(result)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <p className="eyebrow">Extracted details</p>
        {rows.length > 0 && (
          <span className="rounded-full bg-lime/15 px-2 py-0.5 font-mono text-[10px] text-lime">
            {rows.length} fields
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-zinc-500">
          {result ? 'No details were found in the recording.' : 'Details from your recording will appear here.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.key}-${i}`} className="border-b border-white/5 last:border-0 even:bg-white/[0.02]">
                <th
                  scope="row"
                  className="w-2/5 px-4 py-2.5 text-left align-top font-mono text-[11px] font-normal tracking-wider text-zinc-400 uppercase"
                >
                  {row.key}
                </th>
                <td className="px-4 py-2.5 break-words text-zinc-100">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
