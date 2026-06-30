import { useRef } from 'react'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  readOnly?: boolean
  required?: boolean
  id?: string
}

// Thin wrapper over the browser's native date input so every form gets the
// standard browser calendar picker. The value contract is ISO yyyy-mm-dd, which
// is what the native input emits and what the backend expects. A calendar icon
// is overlaid (the default indicator is hidden) and opens the picker on click.
export default function DatePicker({ value, onChange, className = '', readOnly, required, id }: DatePickerProps) {
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
