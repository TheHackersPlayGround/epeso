import { useEffect, useState } from 'react'
import ConfirmModal from '../pages/shared/ConfirmModal'
import { subscribeLeaveRequests, type LeaveRequest } from '../hooks/leaveGuard'

type Stage = 'ask' | 'saved' | 'error'

// Mounted once in App. Shown when the user clicks a back arrow, a tab or the
// navbar while a form has unsaved changes (see hooks/leaveGuard.ts).
export default function NavLeaveGuard() {
  const [req, setReq] = useState<LeaveRequest | null>(null)
  const [stage, setStage] = useState<Stage>('ask')

  useEffect(() => subscribeLeaveRequests(r => { setStage('ask'); setReq(r) }), [])

  if (!req) return null
  const { guard, proceed } = req
  const close = () => setReq(null)

  const discard = () => { guard.discard(); close(); proceed() }
  const saveDraft = () => setStage(guard.saveDraft() ? 'saved' : 'error')

  if (stage === 'saved') {
    return (
      <ConfirmModal
        isOpen type="success" title="Draft Saved"
        message="Your entries were saved as a draft. Click Add again to continue where you left off."
        onConfirm={() => { close(); proceed() }}
        onCancel={() => { close(); proceed() }}
      />
    )
  }
  if (stage === 'error') {
    return (
      <ConfirmModal
        isOpen type="error" title="Could not save draft"
        message="The browser has no room left to store this draft. Your entries are still on the form — please save the record instead."
        onConfirm={close} onCancel={close}
      />
    )
  }
  if (guard.canDraft) {
    return (
      <ConfirmModal
        isOpen type="confirm" title="Leave this form?"
        message={`You have unsaved changes. Save them as a draft to continue later, or discard them.${guard.draftNote ? `\n${guard.draftNote}` : ''}`}
        cancelText="Keep editing" confirmText="Discard" thirdText="Save as draft"
        onCancel={close} onConfirm={discard} onThird={saveDraft}
      />
    )
  }
  return (
    <ConfirmModal
      isOpen type="confirm" title="Discard changes?"
      message="You have unsaved changes. If you leave now they will be lost."
      confirmText="Discard" cancelText="Keep editing"
      onConfirm={discard} onCancel={close}
    />
  )
}
