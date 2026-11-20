import {api} from '../client'
import type {
  AdminUser,
  AdminUserWithGroups,
  APITokenInfo,
  CreatedAPIToken,
  CreateTokenPayload,
  GlobalPermission,
  Group,
  GroupDefaultRoles,
  GroupMember,
  MemberDefaults,
  PasswordChangeInput,
  RoleDefinition,
  RoleSlug,
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
  /** Replaces the user's global permissions (admin access drawer). */
  setGlobalPermissions: (id: number, permissions: GlobalPermission[]) =>
    api.put<void>(`/users/${id}/global-permissions`, {permissions}),

  /** Fetch the user's API tokens. */
  getListOfAPIToken: () => api.get<APITokenInfo[]>('/settings/tokens'),
  createNewAPIToken: (input: CreateTokenPayload) => api.post<CreatedAPIToken>('/settings/tokens', input),
  deleteAPIToken: (id: string) => api.delete<void>(`/settings/tokens/${id}`),

}

/** Backend role catalog — the SPA renders all role UIs from this. */
export const rolesApi = {
  list: () => api.get<RoleDefinition[]>('/roles'),
}

/** Global member defaults (admin "System" tab). */
export const settingsApi = {
  memberDefaults: () => api.get<MemberDefaults>('/settings/member-defaults'),
  setMemberDefaults: (roles: RoleSlug[]) =>
    api.put<void>('/settings/member-defaults', {roles}),
}

export const groupsApi = {
  /** Admins see all groups, members their own. */
  list: () => api.get<Group[]>('/groups'),
  create: (name: string) => api.post<Group>('/groups', {name}),
  remove: (id: number) => api.delete<void>(`/groups/${id}`),
  members: (id: number) => api.get<GroupMember[]>(`/groups/${id}/members`),
  /** `roles` omitted → the group's default roles apply. */
  addMember: (id: number, user: string, roles?: RoleSlug[]) =>
    api.post<GroupMember>(`/groups/${id}/members`, roles ? {user, roles} : {user}),
  removeMember: (groupId: number, userId: number) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}`),
  /** Replaces the member's role set (multi-role). */
  setMemberRoles: (groupId: number, userId: number, roles: RoleSlug[]) =>
    api.put<void>(`/groups/${groupId}/members/${userId}`, {roles}),
  /** Default roles for new members of this group. */
  defaultRoles: (id: number) =>
    api.get<GroupDefaultRoles>(`/groups/${id}/default-roles`),
  setDefaultRoles: (id: number, roles: RoleSlug[]) =>
    api.put<void>(`/groups/${id}/default-roles`, {roles}),
  clearDefaultRoles: (id: number) =>
    api.delete<void>(`/groups/${id}/default-roles`),
  /** Admin self-grant: the admin adds *himself* to a group with roles. */
  selfGrant: (groupId: number, roles: RoleSlug[]) =>
    api.put<void>('/admin/me/groups', {group_id: groupId, roles}),
}
