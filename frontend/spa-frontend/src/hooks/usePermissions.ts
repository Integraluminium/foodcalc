import {useMemo} from 'react'
import type {Group} from "../api";
import {
  type GlobalPermission,
  type GroupPermission,
  hasGlobalPermission,
  hasGroupPermission,
} from '../lib/permissions.ts'
import {useCurrentUser} from './useAuth.ts'

export function useGlobalPermission(permission: GlobalPermission): boolean {
  const { data: user } = useCurrentUser()
  return hasGlobalPermission(user, permission)
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