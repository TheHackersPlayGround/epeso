// Registry that lets navigation outside a form (page back arrows, tabs, the
// navbar) ask "is a form open with unsaved changes?" before leaving. Forms
// register themselves through useFormDraft; <NavLeaveGuard /> (mounted once in
// App) shows the confirmation.

export interface LeaveGuard {
  isDirty: () => boolean
  /** Add forms can be kept as a draft; edit forms can only be discarded. */
  canDraft: boolean
  draftNote?: string
  /** Writes the draft. Returns false if the browser had no room. */
  saveDraft: () => boolean
  discard: () => void
}

export interface LeaveRequest {
  guard: LeaveGuard
  proceed: () => void
}

const guards: LeaveGuard[] = []
let listener: ((req: LeaveRequest) => void) | null = null

export function registerLeaveGuard(guard: LeaveGuard): () => void {
  guards.push(guard)
  return () => {
    const i = guards.indexOf(guard)
    if (i >= 0) guards.splice(i, 1)
  }
}

export function subscribeLeaveRequests(fn: (req: LeaveRequest) => void): () => void {
  listener = fn
  return () => { if (listener === fn) listener = null }
}

/** Runs `proceed` straight away, or after the user has dealt with a dirty open form. */
export function requestLeave(proceed: () => void) {
  const dirty = [...guards].reverse().find(g => g.isDirty())
  if (!dirty || !listener) { proceed(); return }
  listener({ guard: dirty, proceed })
}

/** True when any open form currently has unsaved changes. */
export function hasDirtyForm(): boolean {
  return guards.some(g => g.isDirty())
}
