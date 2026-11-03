import type { OFWProfile } from '../contexts/OFWContext'

// The two request types that carry a "please specify" text. Show what was typed
// there instead of the checkbox label; fall back to the label if it was left blank.
const INQUIRY = 'inquiry (pls specify)'
const OTHER_PROGRAM = 'other DOLE program (please specify)'

export function requestTypeLabels(p: Pick<OFWProfile, 'typeOfRequest' | 'inquirySpecify' | 'otherProgramSpecify'>): string[] {
  return p.typeOfRequest.map(t => {
    if (t === INQUIRY && p.inquirySpecify?.trim()) return `inquiry: ${p.inquirySpecify.trim()}`
    if (t === OTHER_PROGRAM && p.otherProgramSpecify?.trim()) return `other DOLE program: ${p.otherProgramSpecify.trim()}`
    return t
  })
}

export function requestTypeText(p: Pick<OFWProfile, 'typeOfRequest' | 'inquirySpecify' | 'otherProgramSpecify'>): string {
  return requestTypeLabels(p).join(', ')
}
