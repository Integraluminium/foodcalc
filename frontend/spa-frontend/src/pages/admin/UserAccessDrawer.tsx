import {useTranslation} from 'react-i18next'
import type {AdminUserWithGroups, RoleSlug} from '../../api'
import {RoleMultiSelect} from '../../components/patterns/roles/RoleMultiSelect.tsx'
import {Overlay} from '../../components/ui/overlay/Overlay.tsx'
import type {GlobalPermission} from '../../lib/permissions.ts'
import {
  useGroupAdminMutations,
  useRoles,
  useSetGlobalPermissions,
} from '../../hooks/queries/useUsers.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {roleLabel} from '../../lib/roles.ts'
import styles from './AdminPage.module.css'

const GLOBAL_PERMISSIONS: {slug: GlobalPermission; key: string; hint: string}[] = [
  {
    slug: 'admin:manage_users',
    key: 'admin:admin.manageUsers',
    hint: 'admin:admin.manageUsersHint',
  },
  {
    slug: 'admin:manage_master_data',
    key: 'admin:admin.manageMasterData',
    hint: 'admin:admin.manageMasterDataHint',
  },
  {
    slug: 'admin:manage_settings',
    key: 'admin:admin.manageSettings',
    hint: 'admin:admin.manageSettingsHint',
  },
  {
    slug: 'admin:view_audit_log',
    key: 'admin:admin.viewAuditLog',
    hint: 'admin:admin.viewAuditLogHint',
  },
  {
    slug: 'admin:allow_creating',
    key: 'admin:admin.allowCreating',
    hint: 'admin:admin.allowCreatingHint',
  },
]

export interface UserAccessDrawerProps {
  user: AdminUserWithGroups
  onClose: () => void
}

/**
 * Person-centric access management (UX-C): global permission checkboxes
 * (self-lockout protected) plus multi-role group memberships — the same
 * role primitives as the group management page.
 */
export function UserAccessDrawer({user, onClose}: UserAccessDrawerProps) {
  const {t} = useTranslation(['admin', 'settings', 'common'])
  const {data: roles} = useRoles()
  const {data: me} = useCurrentUser()
  const setGlobalPermissions = useSetGlobalPermissions()
  const {setMemberRoles} = useGroupAdminMutations()

  const isSelf = me?.id === user.id
  const globalPermissions = user.global_permissions ?? []

  const toggleGlobal = (slug: GlobalPermission) => {
    const next = globalPermissions.includes(slug)
      ? globalPermissions.filter((permission) => permission !== slug)
      : [...globalPermissions, slug]
    setGlobalPermissions.mutate({id: user.id, permissions: next})
  }

  return (
    <Overlay title={t('admin:users.accessDrawerTitle', {name: user.username})} onClose={onClose} variant="drawer" size="md">
      <section className={styles.drawerSection}>
        <h3 className="section-subtitle">{t('admin:users.globalPermsTitle')}</h3>
        {GLOBAL_PERMISSIONS.map(({slug, key, hint}) => (
          <label key={slug} className={styles.permissionRow}>
            <input
              type="checkbox"
              checked={globalPermissions.includes(slug)}
              disabled={isSelf && slug === 'admin:manage_users'}
              onChange={() => toggleGlobal(slug)}
            />
            <span>
              <span className={styles.permissionName}>{t(key)}</span>
              <span className={styles.permissionHint}>{t(hint)}</span>
            </span>
          </label>
        ))}
        {isSelf && (
          <p className="muted">{t('admin:users.selfLockoutHint')}</p>
        )}
      </section>

      <section className={styles.drawerSection}>
        <h3 className="section-subtitle">{t('admin:users.groupMembershipsTitle')}</h3>
        {user.groups.length === 0 ? (
          <p className="muted">{t('admin:users.noGroups')}</p>
        ) : (
          <table className="table">
            <thead>
            <tr>
              <th>{t('common:table.name')}</th>
              <th>{t('settings:rights.rolesColumn')}</th>
            </tr>
            </thead>
            <tbody>
            {user.groups.map((group) => (
              <tr key={group.id}>
                <td>
                  {group.name}
                  {group.is_personal && (
                    <span className="muted"> ({t('admin:users.personalGroup')})</span>
                  )}
                </td>
                <td>
                  <RoleMultiSelect
                    roles={roles}
                    value={group.roles}
                    disabled={group.is_personal}
                    emptyLabel={t('settings:rights.noRoles')}
                    onChange={(next: RoleSlug[]) => {
                      void setMemberRoles.mutateAsync({
                        groupId: group.id,
                        userId: user.id,
                        roles: next,
                      })
                    }}
                  />
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
        <p className="muted">{t('admin:users.groupRolesHint')}</p>
      </section>
    </Overlay>
  )
}

// Re-export for consistent labels elsewhere in the admin area.
export {roleLabel}
