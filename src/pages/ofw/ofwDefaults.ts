// A complete, empty OFW request form. Its own module (not the form file) so the form stays component-only
// for Fast Refresh and the staff Pending page can reuse it when it opens a kiosk submission.

import type { OFWProfile } from '../../contexts/OFWContext'

export const emptyOFWForm: Omit<OFWProfile, 'id'> = {
  beneficiaryServiceId: 0,
  referenceNumber: '',
  lastName: '', firstName: '', middleName: '', suffix: '',
  name: '',
  sex: '', birthdate: '', civilStatus: '',
  contactNumber: '', email: '',
  address: '', barangay: '', barangayId: 0, municipality: '', province: '', region: '',
  dateFiled: new Date().toISOString().split('T')[0],
  employmentStatus: '',
  typeOfRequest: [],
  status: 'Pending',
  desiredPosition: '', typeOfSkill: '', agencies: [],
  inquirySpecify: '', otherProgramSpecify: '',
  owwaWelfareFile: null,
  elporFiles: {},
  receivedBy: '',
  attachedDocuments: [],
}
