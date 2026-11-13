import { useCallback, useEffect, useState } from 'react'
import { getSubmissionCounts } from '../services/submissionService'

// How often to check for new kiosk submissions. The check is one small query, so 5 seconds feels live without
// loading the server; nothing is asked while the tab is in the background.
const POLL_MS = 5_000

// How many kiosk submissions are waiting for review (the navbar badge), plus a `signature` that changes when
// anything in the inbox changes (new submission, approved, rejected, deleted) so the Pending page can reload
// itself. Re-checks every 5 seconds, when the window regains focus, and whenever `refresh` is called (after approving
// or rejecting). Pass enabled=false for users who can't see the Pending inbox: nothing is fetched.
export function usePendingCount(enabled: boolean) {
  const [count, setCount] = useState(0)
  const [signature, setSignature] = useState('')

  // A failed check keeps the last values; the next poll tries again.
  const refresh = useCallback(
    () => (enabled
      ? getSubmissionCounts().then(c => { setCount(c.total); setSignature(c.signature ?? '') }, () => undefined)
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
