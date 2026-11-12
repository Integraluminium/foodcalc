import type {GroupRole} from '../api'
import {useCurrentUser} from './useAuth'

/**
 * Client-side permission mirror of the backend model (level-based ABAC):
 * group membership grants access to that group, scoped by the member's role
 * (viewer/editor/manager). `isAdmin` gates only the `/admin` surface and the
 * admin self-grant — it does **not** imply resource rights. This hook is the
 * single frontend choke point; callers never check roles inline.
 */
export function usePermissions() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.is_admin ?? false
  const groupIds = user?.groups.map((group) => group.id) ?? []

  /** Role of the user in the given group; `undefined` = not a member. */
  const roleOf = (groupId: number): GroupRole | undefined =>
    user?.groups.find((group) => group.id === groupId)?.role

  return {
    isAdmin,
    groupIds,
    roleOf,
    /** Can the user edit resources of this group? (editor and above) */
    canEditGroup: (groupId: number) =>
      roleOf(groupId) === 'editor' || roleOf(groupId) === 'manager',
    /** Can the user manage group membership / member roles? */
    canManageGroup: (groupId: number) => roleOf(groupId) === 'manager',
  }
}
