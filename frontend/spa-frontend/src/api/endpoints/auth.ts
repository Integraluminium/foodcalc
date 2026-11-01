import { api } from '../client'
import type { CurrentUser, LoginInput } from '../types'

/**
 * Auth endpoints. `login` returns 204 and only sets the session cookie —
 * the current user is fetched separately via `me` (see `useLogin`).
 */
export const authApi = {
  login: (input: LoginInput) => api.post<void>('/auth/login', input),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<CurrentUser>('/auth/me'),
}
