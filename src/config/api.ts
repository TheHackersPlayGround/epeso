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
} as const
