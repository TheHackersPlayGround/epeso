// Copies text to the clipboard and says whether it really worked.
//
// The browser's modern clipboard feature (navigator.clipboard) is switched off on pages that are not "secure": anything other than
// HTTPS or localhost. The deployed system runs on plain HTTP at http://epeso.internal, so there it does not exist, and a copy button that
// only uses it silently does nothing. So when it is not available (or it fails) this falls back to the older method: select the text in
// a hidden box and run the browser's copy command, which works on plain HTTP pages too.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the older method */ }

  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.setAttribute('aria-hidden', 'true')
  box.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.appendChild(box)
  let ok: boolean
  try {
    box.focus()
    box.select()
    box.setSelectionRange(0, text.length)
    ok = document.execCommand('copy')
  } catch { ok = false }
  document.body.removeChild(box)
  previouslyFocused?.focus()
  return ok
}
