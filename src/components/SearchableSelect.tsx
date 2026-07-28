import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  const [dropdownRect, setDropdownRect] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const skipNextSearch = useRef(false)

  const GAP = 4
  const PREFERRED_HEIGHT = 240 // matches the old fixed max-h-60

  // Positioned via `fixed` + measured coordinates instead of `absolute`, so the
  // list floats above the page instead of being clipped -- this field is used
  // inside forms whose step content scrolls in its own `overflow-y-auto` box
  // (e.g. TUPADProfileForm), and an `absolute` dropdown is clipped at that
  // container's edge rather than overlaying the rest of the form. Recomputed on
  // every scroll (capture phase, so it also catches the ancestor scroll
  // container's own scroll events, not just the window's) and resize so it
  // stays glued to the input.
  //
  // Also flips to open upward when there isn't enough room below (e.g. a field
  // near the bottom of the viewport, like Province just above a form's footer
  // buttons) -- otherwise the list runs off the bottom of the screen with no
  // way to reach the rest of it, since it's outside any scrollable ancestor.
  useLayoutEffect(() => {
    if (!open) return
    function updateRect() {
      if (!boxRef.current) return
      const r = boxRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom - GAP
      const spaceAbove = r.top - GAP
      if (spaceBelow < PREFERRED_HEIGHT && spaceAbove > spaceBelow) {
        setDropdownRect({ bottom: window.innerHeight - r.top + GAP, left: r.left, width: r.width, maxHeight: Math.min(PREFERRED_HEIGHT, spaceAbove) })
      } else {
        setDropdownRect({ top: r.bottom + GAP, left: r.left, width: r.width, maxHeight: Math.min(PREFERRED_HEIGHT, spaceBelow) })
      }
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [open])

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
          // Chrome ignores autoComplete="off" on fields it pattern-matches as an
          // address (province/city/etc.), still showing its own native autofill
          // suggestions -- which render above the page entirely, on top of this
          // dropdown, since they're not part of the DOM. "new-password" is the
          // standard workaround: Chrome treats it as an explicit opt-out signal
          // it actually honors, regardless of what the field semantically is.
          autoComplete="new-password"
          name="search-no-autofill"
          className={`${baseInput} ${stateInput}`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </span>
      </div>

      {open && !disabled && dropdownRect && (
        <div
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            bottom: dropdownRect.bottom,
            left: dropdownRect.left,
            width: dropdownRect.width,
            maxHeight: dropdownRect.maxHeight,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] overflow-y-auto"
        >
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
