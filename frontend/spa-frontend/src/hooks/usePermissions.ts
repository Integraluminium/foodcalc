import { useCurrentUser } from './useAuth'

/**
 * Client-side permission mirror of the backend model: `is_admin` grants
 * global access, group membership grants access to that group. This is the
 * single frontend choke point — when per-group roles arrive (Phase 4),
 * only this hook's internals change.
 */
export function usePermissions() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.is_admin ?? false
  const groupIds = user?.groups.map((group) => group.id) ?? []

  return {
    isAdmin,
    groupIds,
    /** Can the user manage (own) resources of this group? */
    canEditGroup: (groupId: number) =>
      isAdmin || groupIds.includes(groupId),
    /** Can the user manage group membership / delete the group? */
    canManageGroup: (groupId: number, isPersonal = false) =>
      !isPersonal && (isAdmin || groupIds.includes(groupId)),
  }
}
