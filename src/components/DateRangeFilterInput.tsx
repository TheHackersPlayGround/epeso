import DatePicker from './DatePicker'
import { splitDateRange, joinDateRange } from '../utils/dateRange'

// From / To pickers shown inside a filter pill. `value` is the "from|to" string
// from utils/dateRange. From can't pass To and To can't precede From.

const PICKER_CLS = 'text-sm bg-white border border-blue-200 rounded-md pl-2 py-0.5 text-blue-700 w-36 focus:outline-none'

export default function DateRangeFilterInput({ value, onChange }: { value: string | undefined; onChange: (value: string) => void }) {
  const { from, to } = splitDateRange(value)
  return (
    <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <span className="text-xs text-blue-600">From</span>
      <DatePicker className={PICKER_CLS} value={from} max={to || undefined} onChange={v => onChange(joinDateRange(v, to))} />
      <span className="text-xs text-blue-600">To</span>
      <DatePicker className={PICKER_CLS} value={to} min={from || undefined} onChange={v => onChange(joinDateRange(from, v))} />
    </span>
  )
}
