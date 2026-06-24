import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  readOnly?: boolean
  required?: boolean
  id?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_HEADS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseISO(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function displayValue(v: string) {
  const d = parseISO(v)
  if (!d) return ''
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

function buildCells(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { day: number; offset: -1 | 0 | 1 }[] = []
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, offset: -1 })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, offset: 0 })
  const rem = 42 - cells.length
  for (let d = 1; d <= rem; d++) cells.push({ day: d, offset: 1 })
  return cells
}

export default function DatePicker({ value, onChange, className = '', readOnly, required, id }: DatePickerProps) {
  const today = new Date()
  const sel = parseISO(value)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'day' | 'month'>('day')
  const [viewYear, setViewYear] = useState(() => sel?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => sel?.getMonth() ?? today.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setView('day')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (sel) { setViewYear(sel.getFullYear()); setViewMonth(sel.getMonth()) }
  }, [value])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const cells = buildCells(viewYear, viewMonth)

  const pick = (cell: (typeof cells)[0]) => {
    let y = viewYear, m = viewMonth
    if (cell.offset === -1) { m--; if (m < 0) { m = 11; y-- } }
    if (cell.offset === 1) { m++; if (m > 11) { m = 0; y++ } }
    onChange(toISO(new Date(y, m, cell.day)))
    setOpen(false)
    setView('day')
  }

  const pickMonth = (m: number) => {
    setViewMonth(m)
    setView('day')
  }

  const isSel = (c: (typeof cells)[0]) =>
    !!sel && c.offset === 0 &&
    sel.getFullYear() === viewYear && sel.getMonth() === viewMonth && sel.getDate() === c.day

  const isToday = (c: (typeof cells)[0]) =>
    c.offset === 0 &&
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === c.day

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div
        id={id}
        className={`${className} flex items-center gap-2 ${readOnly ? '' : 'cursor-pointer select-none'}`}
        onClick={() => !readOnly && setOpen(o => !o)}
      >
        <span className={`flex-1 truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? displayValue(value) : 'mm/dd/yyyy'}
        </span>
        {!readOnly && (
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}
      </div>

      {/* Hidden input for native required validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
        />
      )}

      {/* Calendar popup */}
      {open && !readOnly && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-2xl w-64">

          {/* ── Header ── */}
          <div className="bg-gray-800 rounded-t-xl px-4 py-3 flex items-center justify-between">
            {view === 'day' ? (
              <>
                {/* Month/year button — opens month picker */}
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className="flex items-center gap-1 text-white text-sm font-semibold hover:text-blue-300 transition-colors px-1 py-0.5 rounded hover:bg-gray-700"
                >
                  {MONTHS[viewMonth]} {viewYear}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={prevMonth}
                    className="text-white p-1 hover:bg-gray-700 rounded transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={nextMonth}
                    className="text-white p-1 hover:bg-gray-700 rounded transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Month picker header — year navigation */}
                <button
                  type="button"
                  onClick={() => setView('day')}
                  className="flex items-center gap-1 text-white text-sm font-semibold hover:text-blue-300 transition-colors px-1 py-0.5 rounded hover:bg-gray-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                  {viewYear}
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setViewYear(y => y - 1)}
                    className="text-white p-1 hover:bg-gray-700 rounded transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setViewYear(y => y + 1)}
                    className="text-white p-1 hover:bg-gray-700 rounded transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Day view ── */}
          {view === 'day' && (
            <>
              <div className="grid grid-cols-7 px-3 pt-3">
                {DAY_HEADS.map(h => (
                  <div key={h} className="text-center text-xs font-semibold text-gray-500 pb-1">{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 px-3 pb-2">
                {cells.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(cell)}
                    className={[
                      'aspect-square flex items-center justify-center text-sm rounded-full transition-colors',
                      cell.offset !== 0 ? 'text-gray-400' : 'text-gray-700',
                      isSel(cell) ? 'bg-[#0077BE] text-white font-semibold' : '',
                      !isSel(cell) && isToday(cell) ? 'bg-gray-200 font-semibold text-gray-800' : '',
                      !isSel(cell) && !isToday(cell) ? 'hover:bg-gray-100' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {cell.day}
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-4 pb-3 border-t border-gray-100 pt-2">
                <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                  className="text-sm text-[#0077BE] hover:underline font-medium">
                  Clear
                </button>
                <button type="button" onClick={() => {
                  const t = new Date()
                  setViewYear(t.getFullYear()); setViewMonth(t.getMonth())
                  onChange(toISO(t)); setOpen(false); setView('day')
                }} className="text-sm text-[#0077BE] hover:underline font-medium">
                  Today
                </button>
              </div>
            </>
          )}

          {/* ── Month picker view ── */}
          {view === 'month' && (
            <div className="grid grid-cols-3 gap-2 p-4">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMonth(i)}
                  className={[
                    'py-2 rounded-lg text-sm font-medium transition-colors',
                    i === viewMonth
                      ? 'bg-[#0077BE] text-white'
                      : today.getMonth() === i && today.getFullYear() === viewYear
                        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
