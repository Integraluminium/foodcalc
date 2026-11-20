import {useMemo} from 'react'
import type {EventDetail, Group} from "../api";
import {
  type GlobalPermission,
  type GroupPermission,
  hasAnyGlobalPermission,
  hasGlobalPermission,
  hasGroupPermission,
} from '../lib/permissions.ts'
import {useCurrentUser} from './useAuth.ts'

export function useGlobalPermission(permission: GlobalPermission): boolean {
  const { data: user } = useCurrentUser()
  return hasGlobalPermission(user, permission)
}
/** Determine if user has some admin-level permission (any of the `GlobalPermission` values). */
export function useHasAnyGlobalPermission(): boolean {
  const { data: user } = useCurrentUser()
  return hasAnyGlobalPermission(user)
}



export function useGroupPermission(
  groupId: number | undefined,
  permission: GroupPermission,
  resourcePermissions?: readonly GroupPermission[],
): boolean {
  const { data: user } = useCurrentUser()
  return (
    (resourcePermissions?.includes(permission) ?? false) ||
    hasGroupPermission(user, groupId, permission)
  )
}

/** Replaces `canAnyGroup`: returns the actual groups where the user holds `permission`. */
export function usePermittedGroups(permission: GroupPermission): Group[] {
  const { data: user } = useCurrentUser()
  return useMemo(
    () => user?.groups.filter((g) => g.permissions.includes(permission)) ?? [],
    [user, permission],
  )
}

/**
 * Resolved capability for one event: `detail.permissions` (group baseline ∪
 * direct event roles, resolved by the backend) ∪ the session user's group
 * permission. This is what makes direct event collaborators work in the UI.
 */
export function useEventCapability(
  detail: EventDetail | undefined,
  permission: GroupPermission,
): boolean {
  const { data: user } = useCurrentUser()
  if (!detail) return false
  if (detail.permissions?.includes(permission)) return true
  return hasGroupPermission(user, detail.event.group_id, permission)
}

/** All resolved event capabilities at once — use for declarative UI guards. */
export function useEventCapabilities(detail: EventDetail | undefined) {
  const canView = useEventCapability(detail, 'events:view')
  const canEdit = useEventCapability(detail, 'events:edit')
  const canClone = useEventCapability(detail, 'events:clone')
  const canDelete = useEventCapability(detail, 'events:delete')
  const canTransfer = useEventCapability(detail, 'events:transfer_owner')
  const canManageMeals = useEventCapability(detail, 'events:manage_meals')
  const canManageShopping = useEventCapability(detail, 'events:manage_shopping')
  return {
    canView,
    canEdit,
    canClone,
    canDelete,
    canTransfer,
    canManageMeals,
    canManageShopping,
    canManageAccess: canTransfer,
  }
}