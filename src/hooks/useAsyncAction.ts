import { useEffect, useRef, useState } from 'react'

// Wraps an async click handler so a button can show a spinner and ignore extra clicks
// while the server is still answering.
export function useAsyncAction<A extends unknown[]>(action: (...args: A) => unknown) {
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  const run = async (...args: A) => {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      await action(...args)
    } finally {
      running.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return { run, busy }
}
