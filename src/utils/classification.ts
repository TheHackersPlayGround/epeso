// SPES funding source: "Other" -> "Other — <typed text>", same wording as the batch dialogs.
export function fundingSourceLabel(source: string | undefined, other: string | undefined): string {
  const text = other?.trim()
  return source === 'Other' && text ? `Other — ${text}` : (source ?? '')
}

// "Other" on its own says nothing; show what was typed in the "please specify" box.
// Falls back to plain "Other" if that box was left blank.
export function classificationLabels(classification: string[], other?: string): string[] {
  const text = other?.trim()
  return classification.map(c => (c === 'Other' && text ? `Other: ${text}` : c))
}
