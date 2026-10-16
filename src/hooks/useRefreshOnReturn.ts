import { useEffect, useRef } from 'react'

/**
 * Duplicate-request guard. One user action can fire several triggers at almost
 * the same moment (opening a module + the window regaining focus + the tab
 * becoming visible); a refresh that started less than this long ago already
 * brings in the latest data, so the extra triggers are skipped. This is NOT a
 * freshness rule: any trigger after this window re-fetches.
 */
export const REFRESH_GUARD_MS = 2_500

/**
 * Silently re-syncs a module's data (via its provider's `refreshIfStale`):
 *  - when the page using this hook is opened, and
 *  - when the browser window / tab becomes active again.
 * Every trigger re-fetches; the provider only skips a call that arrives within
 * REFRESH_GUARD_MS of a refresh that has just started.
 */
export function useRefreshOnReturn(refreshIfStale: () => void | Promise<void>) {
  const latest = useRef(refreshIfStale)
  useEffect(() => { latest.current = refreshIfStale })

  useEffect(() => {
    const run = () => { void latest.current() }
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    run()
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
