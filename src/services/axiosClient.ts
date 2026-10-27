// Single configured axios instance for all backend calls.
// withCredentials lets the PHP session cookie flow on every request.

import axios from 'axios'
import { API_BASE } from '../config/api'

const axiosClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Normalizes backend error messages into a consistent Error shape, carrying
// through the optional structured `detail` payload (see core/response.php's error()).
axiosClient.interceptors.response.use(
  (response) => {
    // A plain text/HTML response (instead of JSON) means the backend crashed, even
    // if it returned HTTP 200 -- treat that as a failure, except blobs and empty bodies.
    const type = response.config?.responseType
    if (type !== 'blob' && type !== 'arraybuffer' && type !== 'text'
        && typeof response.data === 'string' && response.data.trim() !== '') {
      const wrapped: Error & { status?: number } = new Error(
        'The server returned an unexpected response, so the action may not have been completed. Please try again or contact the administrator.',
      )
      wrapped.status = 500
      return Promise.reject(wrapped)
    }
    return response
  },
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'Network error'
    const wrapped: Error & { detail?: unknown; status?: number } = new Error(message)
    if (error.response?.data?.detail !== undefined) wrapped.detail = error.response.data.detail
    // HTTP status (undefined for network errors/timeouts), so callers can tell
    // "session ended" (401) from "server/network trouble".
    wrapped.status = error.response?.status
    // A refused action may mean the user's access just changed: let the app
    // re-check their permissions straight away (see App.tsx).
    if (error.response?.status === 403) window.dispatchEvent(new Event('peso:forbidden'))
    // Account was deactivated or deleted while signed in -- tell the app so it can
    // explain (with the right wording) and sign the user out.
    const authCode = error.response?.data?.detail?.code
    if (error.response?.status === 401 && authCode === 'ACCOUNT_DEACTIVATED') {
      window.dispatchEvent(new Event('peso:deactivated'))
    }
    if (error.response?.status === 401 && authCode === 'ACCOUNT_DELETED') {
      window.dispatchEvent(new Event('peso:deleted'))
    }
    return Promise.reject(wrapped)
  },
)

export default axiosClient
