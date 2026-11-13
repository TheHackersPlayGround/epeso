// A complete, empty Skills Training profile form. Its own module (not the form file) so the form stays component-only
// for Fast Refresh and the staff Pending page can reuse it when it opens a kiosk submission.

import type { SkillsTrainingProfile } from '../../contexts/SkillsTrainingContext'

export const emptyForm: Omit<SkillsTrainingProfile, 'id'> = {
  beneficiaryServiceId: 0,
  lastName: '', firstName: '', middleName: '', birthdate: '', age: 0,
  sex: '', civilStatus: '', contactNumber: '',
  streetPurok: '', barangay: '', barangayId: 0, cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: [],
  desiredQualification: [], qualificationOther: [],
  purposeOfTraining: [], purposeOther: [],
  assignedTrainingId: null, assignedTrainingTitle: '', assignedTrainingStatus: null,
  lastCompletedTrainingTitle: '', lastCompletedDate: null, placed: false,
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Waitlisted',
}
