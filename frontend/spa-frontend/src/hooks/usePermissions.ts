import type {GroupRole} from "../api";
import {useCurrentUser} from './useAuth'

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

  /**
   * Get the role of the user in a specific group.
   * Admin users are considered to have the 'manager' role in all groups.
   * @param groupId
   */
  const roleOf = (groupId: number): GroupRole | undefined => {
    if (isAdmin) return 'manager'
    return user?.groups.find((group) => group.id === groupId)?.role
  }

  return {
    isAdmin,
    groupIds,
    roleOf,
    /** Can the user manage (own) resources of this group? */
    canEditGroup: (groupId: number) =>
      isAdmin || roleOf(groupId) === 'viewer',
    /** Can the user manage group membership / delete the group? */
    canManageGroup: (groupId: number) => isAdmin || roleOf(groupId) === 'manager',

  }
}
