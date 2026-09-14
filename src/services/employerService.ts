import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'
import type { Employer } from '../contexts/EmploymentContext'

export async function listEmployers(): Promise<Employer[]> {
  const res = await axiosClient.get<{ status: string; data: Employer[] }>(
    ENDPOINTS.employment.listEmployers,
  )
  return res.data.data ?? []
}

export async function createEmployer(data: Omit<Employer, 'id'>): Promise<number> {
  const res = await axiosClient.post<{ status: string; data: { id: number } }>(
    ENDPOINTS.employment.createEmployer,
    data,
  )
  return res.data.data.id
}

// All-or-nothing batch create: the backend validates every row and writes the
// whole batch in one DB transaction; if any row fails, nothing is saved.
export async function importEmployersBulk(rows: Omit<Employer, 'id'>[]): Promise<{ ids: number[] }> {
  const res = await axiosClient.post<{ status: string; data: { ids: number[]; count: number } }>(
    ENDPOINTS.employment.importEmployersBulk,
    { rows },
  )
  return { ids: res.data.data.ids }
}

export async function updateEmployer(id: number, data: Omit<Employer, 'id'>): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updateEmployer}/${id}`, data)
}

export async function deleteEmployer(id: number): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.deleteEmployer}/${id}`)
}
