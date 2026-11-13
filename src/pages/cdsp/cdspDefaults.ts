// A complete, empty CDSP applicant form. Its own module (not the form file) so the form stays component-only
// for Fast Refresh and the staff Pending page can reuse it when it opens a kiosk submission.

import type { CDSPApplicant } from '../../contexts/CDSPContext'

export const emptyForm: Omit<CDSPApplicant, 'id'> = {
  beneficiaryServiceId: 0, serviceId: 0, assignedActivityId: null, barangayId: 0,
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: '',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: '',
  highestEducation: '', schoolName: '', course: '', strand: '', yearLevel: '', yearGraduated: '',
  employmentStatus: '', currentOccupation: '',
  serviceAvailed: '', assignedActivity: '', assignedActivityStatus: null,
  lastCompletedActivityTitle: '', lastCompletedDate: null, placed: false,
  assignmentHistory: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Active', remarks: '',
  attachedDocuments: [],
}
