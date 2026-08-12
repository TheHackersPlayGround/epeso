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
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'Network error'
    const wrapped: Error & { detail?: unknown } = new Error(message)
    if (error.response?.data?.detail !== undefined) wrapped.detail = error.response.data.detail
    return Promise.reject(wrapped)
  },
)

export default axiosClient
