import { useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  readOnly?: boolean
  required?: boolean
  id?: string
  /** Earliest / latest selectable date, yyyy-mm-dd. */
  min?: string
  max?: string
}

// yyyy-mm-dd -> mm/dd/yyyy ('' when empty or not a date)
function isoToText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// Keeps only digits and adds the slashes as the person types: 11142026 -> 11/14/2026
function maskText(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// mm/dd/yyyy -> yyyy-mm-dd, or '' when incomplete or not a real date (e.g. 02/31/2026)
function textToIso(text: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return ''
  const [, mm, dd, yyyy] = m
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return ''
  if (Number(yyyy) < 1900) return ''
  return `${yyyy}-${mm}-${dd}`
}

// A date box that always reads mm/dd/yyyy, whatever the computer's region setting is (the browser's own date box follows the
// computer's language, so it can show dd/mm/yyyy). Type the date, or use the calendar button. The value stays ISO yyyy-mm-dd.
export default function DatePicker({ value, onChange, className = '', readOnly, required, id, min, max }: DatePickerProps) {
  const nativeRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(() => isoToText(value))
  const [prevValue, setPrevValue] = useState(value)

  // The form changed the value from outside (e.g. loaded a saved record): show it, unless the box already shows that date.
  if (value !== prevValue) {
    setPrevValue(value)
    if (textToIso(text) !== value) setText(isoToText(value))
  }

  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max)

  function handleType(raw: string) {
    const masked = maskText(raw)
    setText(masked)
    const iso = textToIso(masked)
    // Only a complete, real, allowed date counts; anything else leaves the value empty.
    const next = iso && inRange(iso) ? iso : ''
    if (next !== value) onChange(next)
  }

  const invalid = text.length === 10 && !(textToIso(text) && inRange(textToIso(text)))

  const openPicker = () => {
    const el = nativeRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    if (!el || readOnly) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="mm/dd/yyyy"
        maxLength={10}
        value={text}
        onChange={(e) => handleType(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        required={required}
        aria-invalid={invalid || undefined}
        title={invalid ? 'Enter a valid date as mm/dd/yyyy' : undefined}
        className={`${className} pr-9 ${invalid ? '!border-red-400 !ring-1 !ring-red-300' : ''}`}
      />
      {/* The browser's calendar, kept invisible: the button below opens it, and picking a day fills the text box above. */}
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        min={min}
        max={max}
        onChange={(e) => { setText(isoToText(e.target.value)); onChange(e.target.value) }}
        className="absolute right-2.5 bottom-0 w-4 h-0 opacity-0 pointer-events-none"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={readOnly}
        aria-label="Open calendar"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  )
}
