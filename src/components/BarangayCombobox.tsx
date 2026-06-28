import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { searchBarangays, type BarangayMatch } from '../services/locationService'

// Searchable barangay picker backed by the DB location tables.
//
// You type to filter; each result shows "Barangay — City, Province" so duplicate
// barangay names (there are 600+ "Poblacion"s) are easy to tell apart. Selecting
// a result hands the full match back to the parent (barangay_id + city/province/
// region), so the parent can store the resolved barangay_id.
//
// `value` is the barangay text the parent currently holds. Typing calls
// onTextChange (parent should clear any previously resolved city/province/id until
// a new selection is made); picking a result calls onSelect with the full match.

interface BarangayComboboxProps {
  value: string
  onTextChange: (text: string) => void
  onSelect: (match: BarangayMatch) => void
  hasError?: boolean
  placeholder?: string
}

export default function BarangayCombobox({
  value,
  onTextChange,
  onSelect,
  hasError = false,
  placeholder = 'Search barangay…',
}: BarangayComboboxProps) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<BarangayMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  // Suppresses the search that would otherwise fire right after a selection
  // (because selecting updates `value` to the chosen barangay name).
  const skipNextSearch = useRef(false)

  // Debounced search whenever the typed text changes while the menu is open.
  useEffect(() => {
    if (!open) return
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    const term = value.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const data = await searchBarangays(term)
        if (!cancelled) {
          setResults(data)
          setHighlight(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value, open])

  // Close when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function pick(match: BarangayMatch) {
    skipNextSearch.current = true
    onSelect(match)
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const baseInput =
    'w-full px-3 py-2 pr-9 border rounded-lg text-sm outline-none text-gray-900 placeholder:text-gray-500 transition-colors focus:ring-2 focus:border-transparent'
  const stateInput = hasError
    ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300'
    : 'border-gray-300 focus:ring-brand-blue'
  const term = value.trim()

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onTextChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className={`${baseInput} ${stateInput}`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </span>
      </div>

      {open && term.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">No barangays found</p>
          ) : (
            results.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(m)}
                className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                  i === highlight ? 'bg-blue-50' : 'hover:bg-blue-50'
                }`}
              >
                <span className="font-medium text-gray-800">{m.barangay}</span>
                <span className="text-gray-400"> — {m.city}, {m.province}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
