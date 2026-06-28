// API calls for location reference data (address fields).
// All requests go through axiosClient, which carries the PHP session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

// One barangay match, carrying its full city/province/region context so the UI
// can distinguish duplicate barangay names (e.g. the 600+ "Poblacion"s).
export interface BarangayMatch {
  id: number
  barangay: string
  city: string
  province: string
  region: string
}

// GET /api/locations/barangays?search=...
// Returns up to 20 barangays whose name matches the term. Empty term -> [].
export async function searchBarangays(search: string): Promise<BarangayMatch[]> {
  const term = search.trim()
  if (!term) return []

  const res = await axiosClient.get<{ status: string; data: BarangayMatch[] }>(
    ENDPOINTS.locations.barangays,
    { params: { search: term } },
  )
  return res.data.data ?? []
}
