import { useRef } from 'react'
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

// Thin wrapper over the native date input; value is ISO yyyy-mm-dd.
export default function DatePicker({ value, onChange, className = '', readOnly, required, id, min, max }: DatePickerProps) {
  const ref = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null
    if (!el || readOnly) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        required={required}
        min={min}
        max={max}
        className={`${className} pr-9 [&::-webkit-calendar-picker-indicator]:hidden`}
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
