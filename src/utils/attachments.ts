// Standard set of file types accepted by "attach supporting document" uploads
// across every program's profile form. Every accept="" attribute (and its
// matching "Supported formats" caption) should read from here rather than
// hardcode its own copy -- that's how CDSP/GIP/SPES ended up missing Excel
// and TUPAD/SLP/CLPEP/DILP/Skills Training ended up missing Word and Excel
// while Employment Facilitation had both: each form's list drifted on its own.
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx'

export const ATTACHMENT_ACCEPT_LABEL = 'PDF, images (JPG, PNG, GIF, WEBP), Word, and Excel documents.'
