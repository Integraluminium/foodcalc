import { api } from '../client'
import type { CurrentUser, LoginInput, RegisterInput } from '../types'

/**
 * Auth endpoints. `login` returns 204 and only sets the session cookie —
 * the current user is fetched separately via `me` (see `useLogin`).
 * `register` returns the fresh session user directly (201).
 */
export const authApi = {
  login: (input: LoginInput) => api.post<void>('/auth/login', input),
  register: (input: RegisterInput) => api.post<CurrentUser>('/auth/register', input),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<CurrentUser>('/auth/me'),
}
