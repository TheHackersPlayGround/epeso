import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'
import type { Vacancy } from '../contexts/EmploymentContext'

export async function listVacancies(): Promise<Vacancy[]> {
  const res = await axiosClient.get<{ status: string; data: Vacancy[] }>(
    ENDPOINTS.employment.listVacancies,
  )
  return res.data.data ?? []
}

export async function createVacancy(data: Omit<Vacancy, 'id'>): Promise<number> {
  const res = await axiosClient.post<{ status: string; data: { id: number } }>(
    ENDPOINTS.employment.createVacancy,
    data,
  )
  return res.data.data.id
}

export async function updateVacancy(id: number, data: Omit<Vacancy, 'id'>): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updateVacancy}/${id}`, data)
}

export async function toggleVacancyStatus(id: number): Promise<'Open' | 'Closed'> {
  const res = await axiosClient.post<{ status: string; data: { status: 'Open' | 'Closed' } }>(
    `${ENDPOINTS.employment.toggleVacancyStatus}/${id}`,
  )
  return res.data.data.status
}
