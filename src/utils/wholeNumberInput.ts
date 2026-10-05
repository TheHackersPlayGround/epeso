// Helpers for whole-number <input type="number"> fields (slot counts).
// A number input normally accepts ".", ",", "e", "+" and "-". Use both together:
//   <input type="number" min="1" onKeyDown={blockNonWholeNumberKeys}
//          onChange={e => setValue(keepWholeNumber(e.target.value))} />

import type { KeyboardEvent } from 'react'

// Ignore the keys that would make the value a decimal, exponent or negative.
export function blockNonWholeNumberKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

// Covers pasting and dropping text: keeps only the leading digits.
// "12" -> "12", "1.5" -> "1", "-3" -> "", "abc" -> "".
export function keepWholeNumber(value: string): string {
  return value.match(/^\d*/)?.[0] ?? ''
}
