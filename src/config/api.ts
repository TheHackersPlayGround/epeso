// Base URL + endpoint paths for the ePESO backend API.
// Reads VITE_API_BASE from the .env files (falls back to local XAMPP).

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost/epeso_backend/api'

// Endpoint paths map 1:1 to backend modules/{module}.php -> handle({action}).
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  users: {
    list: '/users/list',
    create: '/users/create',
    update: '/users/update',
    deactivate: '/users/deactivate',
  },
  locations: {
    barangays: '/locations/barangays',
    provinces: '/locations/provinces',
    cities: '/locations/cities',
    barangaysByCity: '/locations/barangaysByCity',
    allCities: '/locations/allCities',
  },
  employment: {
    listApplicants: '/employment/listApplicants',
    getApplicant: '/employment/getApplicant',
    getApplicantPhoto: '/employment/getApplicantPhoto',
    getApplicantHistory: '/employment/getApplicantHistory',
    createApplicant: '/employment/createApplicant',
    updateApplicant: '/employment/updateApplicant',
    deleteApplicant: '/employment/deleteApplicant',
    listEmployers: '/employment/listEmployers',
    createEmployer: '/employment/createEmployer',
    updateEmployer: '/employment/updateEmployer',
    deleteEmployer: '/employment/deleteEmployer',
    listVacancies: '/employment/listVacancies',
    createVacancy: '/employment/createVacancy',
    updateVacancy: '/employment/updateVacancy',
    toggleVacancyStatus: '/employment/toggleVacancyStatus',
    listReferrals: '/employment/listReferrals',
    createReferral: '/employment/createReferral',
    updateReferralStatus: '/employment/updateReferralStatus',
    deleteReferral: '/employment/deleteReferral',
    listPlacements: '/employment/listPlacements',
    updatePlacement: '/employment/updatePlacement',
    updatePlacementStatus: '/employment/updatePlacementStatus',
    // Recycle bin (soft-deleted EF records)
    listDeleted: '/employment/listDeleted',
    restoreRecord: '/employment/restoreRecord',
    purgeRecord: '/employment/purgeRecord',
  },
  cdsp: {
    listServices:             '/cdsp/listServices',
    createService:            '/cdsp/createService',
    deleteService:            '/cdsp/deleteService',
    listActivities:           '/cdsp/listActivities',
    createActivity:           '/cdsp/createActivity',
    updateActivity:           '/cdsp/updateActivity',
    updateActivityStatus:     '/cdsp/updateActivityStatus',
    deleteActivity:           '/cdsp/deleteActivity',
    listActivityParticipants: '/cdsp/listActivityParticipants',
    addParticipant:           '/cdsp/addParticipant',
    removeParticipant:        '/cdsp/removeParticipant',
    updateAttendance:         '/cdsp/updateAttendance',
    listProfiles:             '/cdsp/listProfiles',
    getProfile:               '/cdsp/getProfile',
    createProfile:            '/cdsp/createProfile',
    updateProfile:            '/cdsp/updateProfile',
    deleteProfile:            '/cdsp/deleteProfile',
  },
} as const
