import type {CurrentUser} from '../api/types.ts'

export type GroupPermission =
// Events
  | 'events:view'
  | 'events:create'
  | 'events:edit'
  | 'events:delete'
  | 'events:clone'
  | 'events:transfer_owner'
  | 'events:manage_meals'
  | 'events:manage_shopping'
  | 'events:view_calculation'
  | 'events:shopping:add_tour'
  | 'events:shopping:edit_tour'
  | 'status_board:operate'
  // Recipes
  | 'recipes:view'
  | 'recipes:create'
  | 'recipes:edit'
  | 'recipes:delete'
  | 'recipes:transfer_owner'
  // Ingredients
  | 'ingredients:view'
  | 'ingredients:create'
  | 'ingredients:edit'
  | 'ingredients:delete'
  | 'ingredients:transfer_owner'
  // Inventories
  | 'inventories:view'
  | 'inventories:create'
  | 'inventories:edit'
  | 'inventories:delete'
  | 'inventories:transfer_owner'
  // Group administration
  | 'group:manage_members'
  | 'group:manage_settings'
  | 'group:delete'

const arrayWithAllGlobalPermissionsAsValues = [
  'admin:manage_users',
  'admin:manage_master_data',
  "admin:allow_creating",
  'admin:manage_settings',
  'admin:view_audit_log'
] as const;

type GlobalPermission = typeof arrayWithAllGlobalPermissionsAsValues[number];
// export type GlobalPermission =
//   | 'admin:manage_users'
//   | 'admin:manage_master_data'
//   | "admin:allow_creating"
//   | 'admin:manage_settings'
//   | 'admin:view_audit_log'

export function hasGroupPermission(
  user: CurrentUser | null | undefined,
  groupId: number | undefined,
  permission: GroupPermission,
): boolean {
  if (!user || groupId === undefined) return false
  const membership = user.groups.find((g) => g.id === groupId)
  return membership?.permissions.includes(permission) ?? false
}

export function hasAnyGroupWithPermission(
  user: CurrentUser | null | undefined,
  permission: GroupPermission,
): boolean {
  if (!user) return false
  return user.groups.some((g) => g.permissions.includes(permission))
}

export function hasGlobalPermission(
  user: CurrentUser | null | undefined,
  permission: GlobalPermission,
): boolean {
  if (!user) return false
  return user.global_permissions?.includes(permission) ?? false
}

export function hasAnyGlobalPermission(
  user: CurrentUser | null | undefined,
): boolean {
  if (!user) return false
  return arrayWithAllGlobalPermissionsAsValues.some((p) => user.global_permissions?.includes(p))
}