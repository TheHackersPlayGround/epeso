// API calls for auth + System Users (Security tab).
// All requests go through axiosClient, which carries the PHP session cookie.

import axiosClient from './axiosClient'

export interface ApiUser {
  id: number
  firstName: string
  lastName: string
  username: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  permissions: string[]
}

export interface UserPayload {
  firstName: string
  lastName: string
  username: string
  role: string
  status: string
  permissions: string[]
  password?: string      // required on create
  newPassword?: string   // optional on update
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<ApiUser> {
  const { data } = await axiosClient.post('/auth/login', { username, password })
  return data.user
}

export async function logout(): Promise<void> {
  await axiosClient.post('/auth/logout')
}

export async function getMe(): Promise<ApiUser> {
  const { data } = await axiosClient.get('/auth/me')
  return data.user
}

// ── System Users ─────────────────────────────────────────────────────────
export async function getUsers(): Promise<ApiUser[]> {
  const { data } = await axiosClient.get('/users/list')
  return data.users
}

export async function createUser(payload: UserPayload): Promise<ApiUser> {
  const { data } = await axiosClient.post('/users/create', payload)
  return data.user
}

export async function updateUser(id: number, payload: UserPayload): Promise<ApiUser> {
  const { data } = await axiosClient.post(`/users/update/${id}`, payload)
  return data.user
}

export async function deleteUser(id: number): Promise<void> {
  await axiosClient.delete(`/users/delete/${id}`)
}
