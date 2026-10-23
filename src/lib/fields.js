// Check-in form fields and helpers to fill them from the extraction server's
// response.

export const FIELDS = [
  {
    key: 'agent_name',
    label: 'Delivery agent name',
    placeholder: 'e.g. Ravi Kumar',
    aliases: ['agent_name', 'delivery_agent_name', 'delivery_agent', 'agent', 'name', 'person_name', 'delivery_person'],
  },
  {
    key: 'agent_mobile',
    label: 'Agent mobile number',
    placeholder: '10-digit mobile number',
    inputMode: 'tel',
    aliases: ['agent_mobile', 'mobile', 'mobile_number', 'phone', 'phone_number', 'contact', 'contact_number', 'agent_phone'],
  },
  {
    key: 'student_name',
    label: 'Student name',
    placeholder: 'Who the order is for',
    aliases: ['student_name', 'student', 'recipient', 'recipient_name', 'customer', 'customer_name'],
  },
  {
    key: 'app',
    label: 'App',
    placeholder: 'e.g. Swiggy',
    suggestions: ['Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Amazon', 'Flipkart', 'Swiggy Instamart', 'BigBasket', 'Dunzo'],
    aliases: ['app', 'delivery_app', 'platform', 'company', 'service', 'app_name'],
  },
  {
    key: 'hostel',
    label: 'Hostel',
    placeholder: 'e.g. Hostel 12',
    suggestions: [...Array.from({ length: 21 }, (_, i) => `Hostel ${i + 1}`), 'Tansa House'],
    aliases: ['hostel', 'hostel_name', 'hostel_number', 'drop_off_point', 'drop_off', 'destination', 'location'],
  },
  {
    key: 'aadhaar_number',
    label: 'Agent Aadhaar number',
    placeholder: '12-digit Aadhaar number',
    inputMode: 'numeric',
    aliases: ['aadhaar_number', 'aadhaar', 'aadhar', 'aadhar_number', 'aadhaar_no', 'uid', 'uidai'],
  },
]

export const emptyDetails = () => Object.fromEntries(FIELDS.map((f) => [f.key, '']))

const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '')

/** Turn { key: value } or [{ label, value }] into a flat { normalisedKey: value } map. */
function flatten(result) {
  const source = result?.entities ?? result
  const out = {}
  if (Array.isArray(source)) {
    for (const item of source) {
      const k = item?.label ?? item?.type ?? item?.entity ?? item?.key
      const v = item?.value ?? item?.text ?? item?.word
      if (k != null && v != null && out[norm(k)] == null) out[norm(k)] = v
    }
  } else if (source && typeof source === 'object') {
    for (const [k, v] of Object.entries(source)) out[norm(k)] = v
  }
  return out
}

const asText = (v) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v).trim())

/**
 * Map the server response onto the form fields. Only fields the server
 * returned a value for are overwritten, so manual edits to others are kept.
 */
export function detailsFromResponse(result, previous = emptyDetails()) {
  const flat = flatten(result)
  const next = { ...previous }
  for (const field of FIELDS) {
    const hit = field.aliases.map(norm).find((a) => asText(flat[a]))
    if (hit) next[field.key] = asText(flat[hit])
  }
  return next
}
