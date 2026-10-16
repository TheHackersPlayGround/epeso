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

// Optional: surface backend error messages in a consistent shape. Also
// carries through the backend's optional structured `detail` payload (see
// core/response.php's error()) as `.detail` on the thrown Error, for callers
// that need more than just a message (e.g. purge's "has history" warning).
axiosClient.interceptors.response.use(
  (response) => {
    // Every API route answers with JSON, which axios parses into an object. If
    // we got plain text/HTML back instead, the backend crashed (a PHP fatal
    // error or warning is printed as HTML but can still arrive as HTTP 200) --
    // treat that as a failure so the UI never reports success for an action the
    // server did not actually complete. File downloads (blob/arraybuffer) are
    // exempt, and so is an empty body.
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
    // The account was deactivated (or removed) while signed in -- whichever request
    // hit it first, tell the app so it can explain and sign the user out.
    if (error.response?.status === 401 && error.response?.data?.detail?.code === 'ACCOUNT_DEACTIVATED') {
      window.dispatchEvent(new Event('peso:deactivated'))
    }
    return Promise.reject(wrapped)
  },
)

export default axiosClient
