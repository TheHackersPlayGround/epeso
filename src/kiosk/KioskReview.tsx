// The "Please check your information" screen the applicant sees before anything is sent from the kiosk.
// Each program form builds its own list of sections from what the applicant entered; this shows them in
// one common layout (same look as the Employment Facilitation review), sends on "Submit", and reports a
// failed send. Used by the program forms' kiosk mode only.

import { useState } from 'react'
import ApplicantReviewModal from '../pages/employment/shared/ApplicantReviewModal'
import ConfirmModal from '../pages/shared/ConfirmModal'

export interface ReviewSection {
  numeral: string
  title: string
  /** Label / value pairs; a pair with no value is left out. */
  rows?: Array<[string, string | number | null | undefined]>
  /** A single line of text instead of rows (an address, a list of choices). */
  text?: string
}

const hasValue = (v: string | number | null | undefined) => v !== null && v !== undefined && String(v).trim() !== ''

interface KioskReviewProps {
  open: boolean
  sections: ReviewSection[]
  /** "Go back and edit", the X, or a failed send: close the review and return to the form. */
  onBack: () => void
  /** Sends the application. Should throw (reject) if the server refuses it. */
  onSubmit: () => unknown
  /** Called after a successful send. */
  onDone: () => void
}

export default function KioskReview({ open, sections, onBack, onSubmit, onDone }: KioskReviewProps) {
  const [error, setError] = useState('')

  const confirm = async () => {
    try {
      await onSubmit()
      onDone() // the kiosk then shows its own thank-you screen with the reference number
    } catch (err) {
      onBack()
      setError(err instanceof Error && err.message ? err.message : 'Please try again.')
    }
  }

  const summary = (
    <div className="space-y-6">
      {sections.map(sec => {
        const rows = (sec.rows ?? []).filter(([, v]) => hasValue(v))
        return (
          <div key={sec.numeral}>
            <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">{sec.numeral}. {sec.title}</h4>
            {sec.text !== undefined && <div className="text-sm">{sec.text || '—'}</div>}
            {sec.rows && (
              rows.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm max-sm:grid-cols-1">
                  {rows.map(([label, value]) => (
                    <div key={label}><span className="font-semibold">{label}:</span> {String(value)}</div>
                  ))}
                </div>
              ) : <div className="text-sm">—</div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <ApplicantReviewModal
        isOpen={open}
        title="Please check your information"
        message="Please review your answers. If everything is correct, press Submit. Staff will review your application."
        summaryContent={summary}
        onBackToEdit={onBack}
        onConfirm={confirm}
        confirmText="Submit"
        backText="Go back and edit"
      />
      <ConfirmModal
        isOpen={error !== ''}
        type="error"
        title="Could not submit"
        message={`Your application could not be submitted (${error}).\nPlease try again, or ask the staff for help.`}
        onConfirm={() => setError('')}
        onCancel={() => setError('')}
      />
    </>
  )
}
