import { useCallback, useEffect, useState } from 'react'
import { getEmployerUpdateCounts } from '../services/employerPortalService'

// How often to check for new employer requests (one small query; nothing is asked while the tab is in the background).
const POLL_MS = 5_000

// How many employer requests are waiting for staff (the badge on the Employers tab), plus a `signature` that changes
// when anything in the list changes so the Employer Updates list can reload itself. Pass enabled=false for users
// who can't see the Employment module: nothing is fetched.
export function useEmployerUpdatesCount(enabled: boolean) {
  const [count, setCount] = useState(0)
  const [signature, setSignature] = useState('')

  // A failed check keeps the last values; the next poll tries again.
  const refresh = useCallback(
    () => (enabled
      ? getEmployerUpdateCounts().then(c => { setCount(c.pending); setSignature(c.signature) }, () => undefined)
      : Promise.resolve()),
    [enabled],
  )

  useEffect(() => {
    if (!enabled) return
    void refresh()
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, refresh])

  return { count: enabled ? count : 0, signature: enabled ? signature : '', refresh }
}
