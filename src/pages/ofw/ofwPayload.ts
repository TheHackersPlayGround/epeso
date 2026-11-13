// Turns an OFW form into what the server expects. The form keeps the OWWA / ELPOR files in `owwaWelfareFile` and
// `elporFiles`; the server wants them as `namedAttachments`. Used by the OFW page and by the Pending page (when staff
// approve a kiosk submission), so both save the files the same way.

import type { OFWProfile, OFWSavedAttachment } from '../../contexts/OFWContext'

// An absent key means "remove this slot", so every set slot must be sent.
function buildNamedAttachments(elporFiles?: Record<string, OFWSavedAttachment>, owwaWelfareFile?: OFWSavedAttachment | null) {
  const named: Record<string, { fileName: string; dataUrl?: string }> = {}
  if (owwaWelfareFile) named['OWWA Welfare Case Form'] = { fileName: owwaWelfareFile.fileName, dataUrl: owwaWelfareFile.dataUrl }
  for (const [type, att] of Object.entries(elporFiles ?? {})) {
    named[type] = { fileName: att.fileName, dataUrl: att.dataUrl }
  }
  return named
}

export function toOfwApiPayload(data: Omit<OFWProfile, 'id'>) {
  const { elporFiles, owwaWelfareFile, ...rest } = data
  return { ...rest, namedAttachments: buildNamedAttachments(elporFiles, owwaWelfareFile) }
}
