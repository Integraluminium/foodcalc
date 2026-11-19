import type {ReactNode} from 'react'
import {Navigate} from 'react-router-dom'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {
  type GlobalPermission,
  type GroupPermission,
  hasGlobalPermission,
  hasGroupPermission,
} from '../../lib/permissions.ts'

interface RequireGlobalProps {
  permission: GlobalPermission
  fallback?: ReactNode
  redirectTo?: string
  children: ReactNode
}

export function RequireGlobalPermission({
                                          permission,
                                          fallback = null,
                                          redirectTo,
                                          children,
                                        }: RequireGlobalProps) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) return null
  if (!hasGlobalPermission(user, permission)) {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>
  }
  return <>{children}</>
}

interface RequireGroupProps {
  groupId: number | undefined
  permission: GroupPermission
  /** Optional resource-level capability override (e.g. from EventDetail.permissions). */
  resourcePermissions?: readonly GroupPermission[]
  fallback?: ReactNode
  children: ReactNode
}

export function RequireGroupPermission({
                                         groupId,
                                         permission,
                                         resourcePermissions,
                                         fallback = null,
                                         children,
                                       }: RequireGroupProps) {
  const { data: user } = useCurrentUser()

  const allowed =
    (resourcePermissions?.includes(permission) ?? false) ||
    hasGroupPermission(user, groupId, permission)

  return allowed ? <>{children}</> : <>{fallback}</>
}