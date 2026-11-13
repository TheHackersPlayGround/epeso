import { useCallback, useEffect, useRef, useState } from 'react'

// Detects an applicant walking away. After `idleMs` without any touch/key/scroll it starts a
// warning countdown of `graceMs`; if nobody responds, `onTimeout` runs (the kiosk clears the
// form for the next person). `secondsLeft` is non-null while the warning should be shown, and
// `keepAlive` is what the "I'm still here" button calls.

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'input'] as const

export function useIdleTimeout(enabled: boolean, idleMs: number, graceMs: number, onTimeout: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const lastActivity = useRef(0)
  const warningShown = useRef(false)
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => { onTimeoutRef.current = onTimeout })

  const keepAlive = useCallback(() => {
    lastActivity.current = Date.now()
    warningShown.current = false
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    if (!enabled) return
    lastActivity.current = Date.now()
    warningShown.current = false

    // While the warning is up, only the explicit button counts (so a stray touch can't dismiss it).
    const onActivity = () => { if (!warningShown.current) lastActivity.current = Date.now() }
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { passive: true, capture: true })

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current
      if (idleFor >= idleMs + graceMs) {
        warningShown.current = false
        setSecondsLeft(null)
        onTimeoutRef.current()
      } else if (idleFor >= idleMs) {
        warningShown.current = true
        setSecondsLeft(Math.ceil((idleMs + graceMs - idleFor) / 1000))
      }
    }, 1000)

    return () => {
      window.clearInterval(tick)
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, { capture: true })
    }
  }, [enabled, idleMs, graceMs])

  return { secondsLeft: enabled ? secondsLeft : null, keepAlive }
}
