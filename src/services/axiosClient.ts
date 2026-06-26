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

// Optional: surface backend error messages in a consistent shape.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'Network error'
    return Promise.reject(new Error(message))
  },
)

export default axiosClient
