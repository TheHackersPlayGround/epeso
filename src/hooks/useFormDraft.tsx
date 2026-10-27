import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import ConfirmModal from '../pages/shared/ConfirmModal'
import { registerLeaveGuard } from './leaveGuard'

// Shared "unsaved changes / draft" behaviour for the big Add/Edit forms: prompts to
// keep editing, discard, or save as draft, and restores drafts from localStorage per user.

const PREFIX = 'peso_draft:'

interface StoredDraft<T> { savedAt: string; data: T }

function userKey(): string {
  try {
    const u = JSON.parse(localStorage.getItem('peso_current_user') || '{}') as Record<string, unknown>
    return String(u.id ?? u.userId ?? u.username ?? u.email ?? 'anon')
  } catch { return 'anon' }
}

const storageKey = (draftKey: string) => `${PREFIX}${userKey()}:${draftKey}`

function readDraft<T>(draftKey: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(draftKey))
    return raw ? (JSON.parse(raw) as StoredDraft<T>) : null
  } catch { return null }
}

function writeDraft<T>(draftKey: string, data: T): boolean {
  try {
    localStorage.setItem(storageKey(draftKey), JSON.stringify({ savedAt: new Date().toISOString(), data }))
    return true
  } catch { return false } // quota / blocked storage
}

function removeDraft(draftKey: string) {
  try { localStorage.removeItem(storageKey(draftKey)) } catch { /* storage unavailable */ }
}

// Called on logout so a draft (which holds personal data) never outlives the session.
export function clearAllDrafts() {
  try {
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) stale.push(k)
    }
    stale.forEach(k => localStorage.removeItem(k))
  } catch { /* storage unavailable */ }
}

// Maps each draft to its permission module (utils/permissions.ts) so drafts are
// cleared if the user loses edit access -- otherwise the personal data would linger.
const DRAFT_MODULE: Record<string, string> = {
  'cdsp-applicant': 'cdsp',
  'gip-applicant': 'gip',
  'spes-applicant': 'spes',
  'skills-training-profile': 'skills',
  'ofw-request': 'ofw',
  'dilp-beneficiary': 'livelihood',
  'tupad-beneficiary': 'livelihood',
  'slp-beneficiary': 'livelihood',
  'clpep-beneficiary': 'livelihood',
  'employment-applicant': 'employment',
  'employment-employer': 'employment',
  'employment-vacancy': 'employment',
  'maintenance-cdsp-activity': 'cdsp-maintenance',
  'maintenance-gip-workplace': 'gip-maintenance',
  'maintenance-spes-batch': 'spes-maintenance',
  'maintenance-skills-training': 'skills-maintenance',
  'maintenance-dilp-project': 'livelihood-maintenance',
  'maintenance-tupad-project': 'livelihood-maintenance',
  'maintenance-slp-project': 'livelihood-maintenance',
  'maintenance-clpep-project': 'livelihood-maintenance',
}

/** Removes saved drafts belonging to any of the given permission modules. */
export function clearDraftsForModules(modules: string[]) {
  if (modules.length === 0) return
  try {
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const draftKey = k.split(':').pop() ?? ''
      const mod = DRAFT_MODULE[draftKey]
      if (mod && modules.includes(mod)) stale.push(k)
    }
    stale.forEach(k => localStorage.removeItem(k))
  } catch { /* storage unavailable */ }
}

interface Options<T> {
  /** Identifies the form type, e.g. 'cdsp-applicant'. One draft per user per key. */
  draftKey: string
  mode: 'add' | 'edit'
  /** The complete current form state (everything the user can change). Must be JSON-serialisable. */
  snapshot: T
  /** Applies a restored draft back onto the form's state. */
  onRestore: (data: T) => void
  /** Called once the user has chosen how to leave (or nothing needed asking). */
  onClose: () => void
  /** Strip things that can't be stored in a draft (e.g. attached files). */
  forDraft?: (data: T) => T
  /** Text shown under "Save as draft" explaining what a draft leaves out. */
  draftNote?: string
  /**
   * For hosts that keep one long-lived component and swap forms in and out
   * (e.g. a maintenance page with several actions). The guard is only active
   * while `enabled`, and every change of `resetKey` starts a fresh form: the
   * unsaved-changes baseline is re-captured and a stored draft is offered again.
   * Leave both unset for a form that is simply mounted and unmounted.
   */
  enabled?: boolean
  resetKey?: string
}

export function useFormDraft<T>({ draftKey, mode, snapshot, onRestore, onClose, forDraft, draftNote, enabled = true, resetKey = '' }: Options<T>) {
  const isAdd = mode === 'add'
  const current = JSON.stringify(snapshot)

  // Baseline + stored-draft prompt are captured per "form instance" (resetKey).
  // State set during render is the supported way to derive state from a changed prop.
  const [instance, setInstance] = useState<{ key: string; baseline: string; pending: StoredDraft<T> | null }>(
    () => ({ key: resetKey, baseline: current, pending: enabled && isAdd ? readDraft<T>(draftKey) : null }),
  )
  if (instance.key !== resetKey) {
    setInstance({ key: resetKey, baseline: current, pending: enabled && isAdd ? readDraft<T>(draftKey) : null })
  }
  const fresh = instance.key === resetKey
  const dirty = enabled && fresh && current !== instance.baseline
  const pending = enabled && fresh ? instance.pending : null
  const setPending = (p: StoredDraft<T> | null) => setInstance(prev => ({ ...prev, pending: p }))
  const [leaving, setLeaving] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // 'submitted' = parent was asked to save. If the form then unmounts without the
  // user having chosen discard/draft, the save succeeded → the draft is obsolete.
  const submitted = useRef(false)
  const userChoice = useRef(false)
  useEffect(() => {
    submitted.current = false
    userChoice.current = false
    return () => {
      if (isAdd && submitted.current && !userChoice.current) removeDraft(draftKey)
    }
  }, [draftKey, isAdd, resetKey])

  // Let navigation outside the form (back arrows, tabs, navbar) ask us first.
  const live = useRef({ dirty, snapshot, forDraft, isAdd })
  useEffect(() => { live.current = { dirty, snapshot, forDraft, isAdd } })
  useEffect(() => registerLeaveGuard({
    get canDraft() { return live.current.isAdd },
    draftNote,
    isDirty: () => live.current.dirty,
    saveDraft: () => {
      const { snapshot: snap, forDraft: strip } = live.current
      const ok = writeDraft(draftKey, strip ? strip(snap) : snap)
      if (ok) userChoice.current = true
      return ok
    },
    discard: () => {
      userChoice.current = true
      if (live.current.isAdd) removeDraft(draftKey)
    },
  }), [draftKey, draftNote])

  // Browser refresh / tab close while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const requestClose = () => {
    if (dirty) setLeaving(true)
    else onClose()
  }

  /** Wrap the form's save call so a successful save clears its draft. */
  const markSubmitted = () => { submitted.current = true; userChoice.current = false }
  const wrapSave = <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R => { markSubmitted(); return fn(...args) }

  const keepEditing = () => setLeaving(false)

  const discard = () => {
    userChoice.current = true
    if (isAdd) removeDraft(draftKey)
    setLeaving(false)
    onClose()
  }

  const saveDraft = () => {
    userChoice.current = true
    const data = forDraft ? forDraft(snapshot) : snapshot
    if (!writeDraft(draftKey, data)) { userChoice.current = false; setStorageFailed(true); setLeaving(false); return }
    // Confirm first; the form closes when the user clicks OK.
    setLeaving(false)
    setDraftSaved(true)
  }

  const closeAfterSaved = () => {
    setDraftSaved(false)
    onClose()
  }

  const continueDraft = () => {
    if (pending) onRestore(pending.data)
    setPending(null)
  }

  const startNew = () => {
    removeDraft(draftKey)
    setPending(null)
  }

  const modals: ReactNode = (
    <>
      <ConfirmModal
        isOpen={!!pending}
        type="confirm"
        confirmVariant="brand"
        title="Unfinished entry found"
        message={`You have an unfinished draft.\nContinue where you left off, or start a new empty form?\n(Starting new discards the draft.)`}
        confirmText="Continue draft"
        cancelText="Start new"
        onConfirm={continueDraft}
        onCancel={startNew}
      />
      <ConfirmModal
        isOpen={leaving && isAdd}
        type="confirm"
        title="Leave this form?"
        message={`You have unsaved changes. Save them as a draft to continue later, or discard them.${draftNote ? `\n${draftNote}` : ''}`}
        cancelText="Keep editing"
        confirmText="Discard"
        thirdText="Save as draft"
        onCancel={keepEditing}
        onConfirm={discard}
        onThird={saveDraft}
      />
      <ConfirmModal
        isOpen={leaving && !isAdd}
        type="confirm"
        title="Discard changes?"
        message="You have unsaved changes. If you leave now they will be lost."
        confirmText="Discard"
        cancelText="Keep editing"
        onConfirm={discard}
        onCancel={keepEditing}
      />
      <ConfirmModal
        isOpen={draftSaved}
        type="success"
        title="Draft Saved"
        message="Your entries were saved as a draft. Click Add again to continue where you left off."
        onConfirm={closeAfterSaved}
        onCancel={closeAfterSaved}
      />
      <ConfirmModal
        isOpen={storageFailed}
        type="error"
        title="Could not save draft"
        message="The browser has no room left to store this draft. Your entries are still on the form — please save the record instead."
        onConfirm={() => setStorageFailed(false)}
        onCancel={() => setStorageFailed(false)}
      />
    </>
  )

  return { requestClose, wrapSave, markSubmitted, modals, dirty }
}

// Convenience wrapper for applicant/beneficiary profile forms (record + province/city
// picker ids + attachedDocuments). Files are tracked by id only -- base64 is too big to diff/draft.
interface ProfileDraftOptions<F extends { attachedDocuments?: { id: string }[] }> {
  draftKey: string
  mode: 'add' | 'edit' | 'view'
  formData: F
  setFormData: Dispatch<SetStateAction<F>>
  provinceId: number | null
  setProvinceId: (id: number | null) => void
  cityId: number | null
  setCityId: (id: number | null) => void
  onClose: () => void
  /** Fields that must keep their current value when a draft is restored (e.g. a freshly issued reference number). */
  keep?: (keyof F)[]
}

type ProfileDraftShape = { form: Record<string, unknown>; provinceId: number | null; cityId: number | null }

export function useProfileDraft<F extends { attachedDocuments?: { id: string }[] }>(o: ProfileDraftOptions<F>) {
  return useFormDraft<ProfileDraftShape>({
    draftKey: o.draftKey,
    mode: o.mode === 'add' ? 'add' : 'edit',
    snapshot: {
      form: { ...o.formData, attachedDocuments: (o.formData.attachedDocuments ?? []).map(d => d.id) },
      provinceId: o.provinceId,
      cityId: o.cityId,
    },
    onRestore: (d) => {
      o.setFormData(prev => {
        const restored = { ...(d.form as unknown as F), attachedDocuments: [] } as F
        for (const k of o.keep ?? []) restored[k] = prev[k]
        return restored
      })
      o.setProvinceId(d.provinceId)
      o.setCityId(d.cityId)
    },
    forDraft: (d) => ({ ...d, form: { ...d.form, attachedDocuments: [] } }),
    draftNote: 'Attached documents are not kept in a draft.',
    onClose: o.onClose,
  })
}
