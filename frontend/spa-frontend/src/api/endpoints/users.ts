import { api } from '../client'
import type {
  AdminUser,
  AdminUserWithGroups,
  Group,
  GroupMember,
  PasswordChangeInput,
  UserUpdateInput,
} from '../types'

/** User management (admin) and group management (admin or group members). */
export const usersApi = {
  list: (search?: string) =>
    api.get<AdminUserWithGroups[]>(
      search ? `/users?search=${encodeURIComponent(search)}` : '/users',
    ),
  update: (id: number, input: UserUpdateInput) =>
    api.put<AdminUser>(`/users/${id}`, input),
  remove: (id: number) => api.delete<void>(`/users/${id}`),
  changePassword: (id: number, input: PasswordChangeInput) =>
    api.put<void>(`/users/${id}/password`, input),
}

export const groupsApi = {
  /** Admins see all groups, members their own. */
  list: () => api.get<Group[]>('/groups'),
  create: (name: string) => api.post<Group>('/groups', { name }),
  remove: (id: number) => api.delete<void>(`/groups/${id}`),
  members: (id: number) => api.get<GroupMember[]>(`/groups/${id}/members`),
  addMember: (id: number, user: string) =>
    api.post<GroupMember>(`/groups/${id}/members`, { user }),
  removeMember: (groupId: number, userId: number) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}`),
}