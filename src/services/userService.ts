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
  securityQuestionsSet?: boolean   // admins must set up questions on first login
}

export interface SecurityQuestion {
  id: number
  text: string
}

export interface ForgotQuestion {
  position: number
  id: number
  text: string
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

// ── Security questions (admin forgot-password) ────────────────────────────
// The master list of 10 questions (used by first-login setup).
export async function getSecurityQuestions(): Promise<SecurityQuestion[]> {
  const { data } = await axiosClient.get('/auth/security-questions')
  return data.questions
}

// First-login setup: save the admin's 3 chosen questions + answers.
export async function setupSecurityAnswers(questions: number[], answers: string[]): Promise<void> {
  await axiosClient.post('/auth/security-answers', { questions, answers })
}

// Forgot flow (not logged in): fetch the admin's 3 chosen questions by username.
export async function getForgotQuestions(username: string): Promise<ForgotQuestion[]> {
  const { data } = await axiosClient.post('/auth/forgot-questions', { username })
  return data.questions
}

// Forgot flow: check the 3 answers only (no change) before showing the reset form.
export async function verifyForgotAnswers(username: string, answers: string[]): Promise<void> {
  await axiosClient.post('/auth/forgot-verify', { username, answers })
}

// Forgot flow: verify the 3 answers and set a new password.
export async function resetPasswordWithAnswers(
  username: string, answers: string[], newPassword: string,
): Promise<void> {
  await axiosClient.post('/auth/forgot-reset', { username, answers, newPassword })
}
