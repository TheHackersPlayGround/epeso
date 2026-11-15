// Which of an applicant's uploaded documents are sent to the employer for a referral. Nothing is shared automatically: staff choose.
// See backend modules/referral_documents.php.
import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export interface ShareableDocument {
  id: number
  /** The document's type (or the typed title for "Others (Specify)"). */
  label: string
  fileName: string
  fileSize: number
  uploadedAt: string
  /** Types staff usually send (Resume, Application Letter, Biodata): ticked by default in the Refer screen. */
  suggested: boolean
  /** With a referralId: already shared for that referral. */
  shared?: boolean
}

// GET: the applicant's Employment Facilitation documents; pass the referral to see which are already shared for it.
export async function listShareableDocuments(applicantId: number, referralId?: number): Promise<ShareableDocument[]> {
  const res = await axiosClient.get<{ status: string; data: ShareableDocument[] }>(
    ENDPOINTS.referralDocuments.list, { params: { applicantId, ...(referralId ? { referralId } : {}) } })
  return res.data.data ?? []
}

// POST: the shared set of the referral becomes exactly these documents.
export async function setSharedDocuments(referralId: number, documentIds: number[]): Promise<number> {
  const res = await axiosClient.post<{ status: string; data: { count: number } }>(`${ENDPOINTS.referralDocuments.set}/${referralId}`, { documentIds })
  return res.data.data.count
}
