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

// A simple { id, name } location option (province / city / barangay).
export interface LocationOption {
  id: number
  name: string
}

// GET /api/locations/provinces?search=...  (empty search returns all)
export async function searchProvinces(search: string): Promise<LocationOption[]> {
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    ENDPOINTS.locations.provinces,
    { params: { search: search.trim() } },
  )
  return res.data.data ?? []
}

// GET /api/locations/cities?provinceId=..&search=..  (cities within a province)
export async function searchCities(provinceId: number, search: string): Promise<LocationOption[]> {
  if (!provinceId) return []
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    ENDPOINTS.locations.cities,
    { params: { provinceId, search: search.trim() } },
  )
  return res.data.data ?? []
}

// GET /api/locations/barangaysByCity?cityId=..&search=..  (barangays within a city)
export async function searchBarangaysByCity(cityId: number, search: string): Promise<LocationOption[]> {
  if (!cityId) return []
  const res = await axiosClient.get<{ status: string; data: LocationOption[] }>(
    ENDPOINTS.locations.barangaysByCity,
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
    ENDPOINTS.locations.allCities,
    { params: { search: term } },
  )
  return res.data.data ?? []
}
