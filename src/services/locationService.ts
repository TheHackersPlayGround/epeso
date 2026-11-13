// API calls for location reference data (address fields).
// All requests go through axiosClient, which carries the PHP session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

// A simple { id, name } location option (province / city / barangay).
export interface LocationOption {
  id: number
  name: string
}

// Which backend paths the lookups call. The staff app uses the logged-in endpoints; the
// applicant kiosk page (no login) switches to the public ones once, at startup.
let endpoints: { provinces: string; cities: string; barangaysByCity: string; allCities: string } = ENDPOINTS.locations
export function switchToKioskLocations(): void {
  endpoints = ENDPOINTS.kiosk
}

// GET /api/locations/provinces?search=...  (empty search returns all)
export async function searchProvinces(search: string): Promise<LocationOption[]> {
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    endpoints.provinces,
    { params: { search: search.trim() } },
  )
  return res.data.data ?? []
}

// GET /api/locations/cities?provinceId=..&search=..  (cities within a province)
export async function searchCities(provinceId: number, search: string): Promise<LocationOption[]> {
  if (!provinceId) return []
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    endpoints.cities,
    { params: { provinceId, search: search.trim() } },
  )
  return res.data.data ?? []
}

// GET /api/locations/barangaysByCity?cityId=..&search=..  (barangays within a city)
export async function searchBarangaysByCity(cityId: number, search: string): Promise<LocationOption[]> {
  if (!cityId) return []
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    endpoints.barangaysByCity,
    { params: { cityId, search: search.trim() } },
  )
  return res.data.data ?? []
}

// GET /api/locations/allCities?search=..  (cities across all provinces; name is
// "City, Province"). Used for free-standing city pickers like the work address.
export async function searchAllCities(search: string): Promise<LocationOption[]> {
  const term = search.trim()
  if (!term) return []
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    endpoints.allCities,
    { params: { search: term } },
  )
  return res.data.data ?? []
}
