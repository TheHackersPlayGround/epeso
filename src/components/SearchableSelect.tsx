import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type { LocationOption } from '../services/locationService'

// Generic searchable dropdown backed by an async fetch.
//
// Type to filter; options load (debounced) from `fetchOptions`. Picking a result
// calls `onSelect` with the full { id, name }. Used to build the cascading
// Province -> City -> Barangay address pickers.
//
// `value` is the confirmed selection's display name held by the parent. When the
// parent clears it (e.g. province changed), the field resets. `refetchKey` lets
// the parent force the open list to reload for a new scope (e.g. a new province).

interface SearchableSelectProps {
  value: string
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  fetchOptions: (search: string) => Promise<LocationOption[]>
  onSelect: (opt: LocationOption) => void
  refetchKey?: string | number
}

export default function SearchableSelect({
  value,
  placeholder = 'Search…',
  disabled = false,
  hasError = false,
  fetchOptions,
  onSelect,
  refetchKey,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  const [results, setResults] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const skipNextSearch = useRef(false)

  // Keep the input text in sync with the confirmed value from the parent
  // (covers external resets like province changing or edit-mode prefill).
  useEffect(() => { setText(value) }, [value])

  // Debounced fetch whenever the typed text changes while open (or scope changes).
  useEffect(() => {
    if (!open || disabled) return
    if (skipNextSearch.current) { skipNextSearch.current = false; return }

    setLoading(true)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const data = await fetchOptions(text.trim())
        if (!cancelled) { setResults(data); setHighlight(0) }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [text, open, disabled, refetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close (and revert text to the confirmed value) when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setText(value)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [value])

  function pick(opt: LocationOption) {
    skipNextSearch.current = true
    onSelect(opt)
    setText(opt.name)
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && results[highlight]) { e.preventDefault(); pick(results[highlight]) }
    else if (e.key === 'Escape') { setOpen(false); setText(value) }
  }

  const baseInput =
    'w-full px-3 py-2 pr-9 border rounded-lg text-sm outline-none text-gray-900 placeholder:text-gray-500 transition-colors focus:ring-2 focus:border-transparent'
  const stateInput = disabled
    ? 'border-gray-300 bg-gray-50 cursor-not-allowed text-gray-400'
    : hasError
      ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300'
      : 'border-gray-300 focus:ring-brand-blue'

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className={`${baseInput} ${stateInput}`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </span>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">No results found</p>
          ) : (
            results.map((opt, i) => (
              <button
                key={opt.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(opt)}
                className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                  i === highlight ? 'bg-blue-50' : 'hover:bg-blue-50'
                }`}
              >
                <span className="text-gray-800">{opt.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
