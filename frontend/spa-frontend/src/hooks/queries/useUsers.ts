import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import type {GroupDefaultRoles} from '../../api'
import {auditApi, groupsApi, queryKeys, rolesApi, settingsApi, usersApi,} from '../../api'
import type {AuditFilter, GlobalPermission, PasswordChangeInput, RoleSlug, UserUpdateInput,} from '../../api/types'

const USERS_ROOT = ['users'] as const
const GROUPS_ROOT = ['groups'] as const

/** Admin user list with group roles and global permissions. */
export function useUsers(search: string) {
  return useQuery({
    queryKey: queryKeys.users.list(search),
    queryFn: () => usersApi.list(search || undefined),
  })
}

/** Backend role catalog; cached for the whole session. */
export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: rolesApi.list,
    staleTime: Infinity,
  })
}

function useInvalidateUsersGroups() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({queryKey: USERS_ROOT})
    void queryClient.invalidateQueries({queryKey: GROUPS_ROOT})
    // Owner pickers read the same endpoint under the master cache key.
    void queryClient.invalidateQueries({queryKey: ['master', 'groups']})
  }
}

/** All admin user mutations; each success refreshes users and groups. */
export function useUserAdminMutations() {
  const invalidate = useInvalidateUsersGroups()

  const update = useMutation({
    mutationFn: (args: { id: number } & UserUpdateInput) => {
      const { id, ...input } = args
      return usersApi.update(id, input)
    },
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: invalidate,
  })
  const changePassword = useMutation({
    mutationFn: (args: { id: number } & PasswordChangeInput) => {
      const { id, ...input } = args
      return usersApi.changePassword(id, input)
    },
    onSuccess: invalidate,
  })

  return {update, remove, changePassword}
}

/** Replaces a user's global permissions (admin access drawer). */
export function useSetGlobalPermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: number; permissions: GlobalPermission[] }) =>
      usersApi.setGlobalPermissions(args.id, args.permissions),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({queryKey: USERS_ROOT})
      // The session user's own capabilities may have changed.
      void queryClient.invalidateQueries({queryKey: queryKeys.auth.me})
      void args
    },
  })
}

/** Members of one group (admin or group members). */
export function useGroupMembers(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsApi.members(groupId),
    enabled: groupId > 0 && enabled,
  })
}

/** Default roles for new members of a group (guard `group:manage_settings`). */
export function useGroupDefaultRoles(groupId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.defaultRoles(groupId),
    queryFn: () => groupsApi.defaultRoles(groupId),
    enabled: groupId > 0 && enabled,
  })
}

export function useGroupDefaultRolesMutations(groupId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({queryKey: queryKeys.groups.defaultRoles(groupId)})
    void queryClient.invalidateQueries({queryKey: GROUPS_ROOT})
  }
  const set = useMutation({
    mutationFn: (roles: RoleSlug[]) => groupsApi.setDefaultRoles(groupId, roles),
    onSuccess: invalidate,
  })
  const clear = useMutation({
    mutationFn: () => groupsApi.clearDefaultRoles(groupId),
    onSuccess: invalidate,
  })
  return {set, clear}
}

/** Global default roles for new members (guard `admin:manage_settings`). */
export function useMemberDefaults() {
  return useQuery({
    queryKey: queryKeys.memberDefaults,
    queryFn: settingsApi.memberDefaults,
  })
}

export function useSetMemberDefaults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roles: RoleSlug[]) => settingsApi.setMemberDefaults(roles),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.memberDefaults})
    },
  })
}

/** Group create/delete plus membership add/remove (multi-role). */
export function useGroupAdminMutations() {
  const invalidate = useInvalidateUsersGroups()

  const createGroup = useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: invalidate,
  })
  const removeGroup = useMutation({
    mutationFn: (id: number) => groupsApi.remove(id),
    onSuccess: invalidate,
  })
  const addMember = useMutation({
    mutationFn: (args: { groupId: number; user: string; roles?: RoleSlug[] }) =>
      groupsApi.addMember(args.groupId, args.user, args.roles),
    onSuccess: invalidate,
  })
  const removeMember = useMutation({
    mutationFn: (args: { groupId: number; userId: number }) =>
      groupsApi.removeMember(args.groupId, args.userId),
    onSuccess: invalidate,
  })
  const setMemberRoles = useMutation({
    mutationFn: (args: { groupId: number; userId: number; roles: RoleSlug[] }) =>
      groupsApi.setMemberRoles(args.groupId, args.userId, args.roles),
    onSuccess: invalidate,
  })

  return {createGroup, removeGroup, addMember, removeMember, setMemberRoles}
}

/**
 * Admin self-grant (`PUT /api/admin/me/groups`): der Admin trägt sich selbst
 * mit Rollen in eine Gruppe ein; danach gilt für ihn das normale ACS.
 */
export function useAdminSelfGrant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { groupId: number; roles: RoleSlug[] }) =>
      groupsApi.selfGrant(args.groupId, args.roles),
    onSuccess: () => {
      // Die eigene Mitgliedschaft steckt in /auth/me — dort und in den
      // Gruppen-Caches nachziehen.
      void queryClient.invalidateQueries({queryKey: queryKeys.auth.me})
      void queryClient.invalidateQueries({queryKey: queryKeys.master.groups})
      void queryClient.invalidateQueries({queryKey: queryKeys.groups.list})
    },
  })
}

/** Filtered audit log page (guard `admin:view_audit_log`). */
export function useAuditLog(filter: AuditFilter) {
  return useQuery({
    queryKey: queryKeys.audit(filter),
    queryFn: () => auditApi.list(filter),
  })
}

/** Audit CSV evidence export. */
export function useAuditExport() {
  return useMutation({
    mutationFn: (filter: AuditFilter) => auditApi.exportCsv(filter),
  })
}

/** Group defaults payload shape re-export for consumers. */
export type {GroupDefaultRoles}
