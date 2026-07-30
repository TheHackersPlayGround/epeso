import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listActivityLogs() {
  return axiosClient.get(ENDPOINTS.activityLogs.list).then(r => r.data)
}
