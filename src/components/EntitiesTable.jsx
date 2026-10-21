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
    <div>
      <p className="label mb-2">Extracted details</p>

      {loading ? (
        <p className="py-3 text-sm text-zinc-400">Extracting…</p>
      ) : rows.length === 0 ? (
        <p className="py-3 text-sm text-zinc-400">
          {result ? 'No details were found in the recording.' : 'Details from your recording will appear here.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row, i) => (
              <tr key={`${row.key}-${i}`}>
                <th scope="row" className="w-2/5 py-2 pr-4 text-left align-top font-normal text-zinc-500">
                  {row.key}
                </th>
                <td className="py-2 break-words text-zinc-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
