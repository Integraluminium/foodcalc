import type {GroupPermission, RoleDefinition} from '../api/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Translate = (...args: any[]) => any

/**
 * Display label of a role slug: i18n `common:roles.<slug>` overrides the
 * backend-provided name, which itself is the last fallback. New backend
 * roles therefore render immediately without any frontend change.
 */
export function roleLabel(
  slug: string,
  t: Translate,
  catalog: RoleDefinition[] | undefined,
): string {
  return t(`common:roles.${slug}`, {
    defaultValue: catalog?.find((role) => role.slug === slug)?.name ?? slug,
  })
}

/** Domain prefix of a permission string (`events:edit` → `events`). */
export function permissionDomain(permission: GroupPermission): string {
  return permission.split(':')[0]
}

/** Union of permissions of the given role slugs (mirrors the backend). */
export function effectivePermissions(
  slugs: readonly string[],
  catalog: RoleDefinition[] | undefined,
): GroupPermission[] {
  const set = new Set<GroupPermission>()
  for (const slug of slugs) {
    for (const permission of catalog?.find((role) => role.slug === slug)?.permissions ?? []) {
      set.add(permission)
    }
  }
  return [...set].sort()
}
