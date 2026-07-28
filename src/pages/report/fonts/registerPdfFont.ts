import type jsPDF from 'jspdf'
import { DEJAVU_SANS_NORMAL_BASE64 } from './DejaVuSansNormal'
import { DEJAVU_SANS_BOLD_BASE64 } from './DejaVuSansBold'

// The name every doc.setFont(...) call in this module's PDF exports uses
// instead of 'helvetica'.
export const PDF_FONT_FAMILY = 'DejaVuSans'

// Registers DejaVu Sans (normal + bold) into a jsPDF document's virtual file
// system. Standard PDF core fonts (Helvetica, Times, Courier) only support
// WinAnsi/Latin-1 -- a character outside that set (e.g. the peso sign, ₱)
// isn't rejected or shown as a "missing glyph" box, it silently renders
// whatever glyph the font has at a colliding code point instead, which is why
// "₱1,000" was showing up as something like "±1,000". DejaVu Sans has real
// Unicode coverage (verified against U+20B1 specifically before adopting it).
// Call once per `new jsPDF()` instance, before any doc.setFont(PDF_FONT_FAMILY, ...) call.
export function registerPdfFont(doc: jsPDF) {
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_NORMAL_BASE64)
  doc.addFont('DejaVuSans.ttf', PDF_FONT_FAMILY, 'normal')
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD_BASE64)
  doc.addFont('DejaVuSans-Bold.ttf', PDF_FONT_FAMILY, 'bold')
}
