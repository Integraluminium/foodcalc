import {useTranslation} from 'react-i18next'
import type {RoleDefinition, RoleSlug} from '../../../api'
import {Overlay} from '../../ui/overlay/Overlay.tsx'
import {effectivePermissions, permissionDomain, roleLabel} from '../../../lib/roles.ts'
import styles from './MemberRoleDetailDrawer.module.css'

export interface MemberRoleDetailDrawerProps {
  /** Display name of the member (or target of the assignment). */
  memberName: string
  roles: RoleDefinition[] | undefined
  value: RoleSlug[]
  onChange: (nextRoles: RoleSlug[]) => void
  /** Slugs that cannot be unchecked (e.g. the last `manager`). */
  lockedRoles?: string[]
  lockedReason?: string
  onClose: () => void
}

/**
 * UX-C detail drawer: role checkboxes grouped by category plus an
 * effective-permission preview computed from the catalog.
 */
export function MemberRoleDetailDrawer({
  memberName,
  roles,
  value,
  onChange,
  lockedRoles = [],
  lockedReason,
  onClose,
}: MemberRoleDetailDrawerProps) {
  const {t} = useTranslation(['settings', 'common'])
  const basics = (roles ?? []).filter((role) => role.category === 'basic')
  const domains = (roles ?? []).filter((role) => role.category === 'domain')
  const effective = effectivePermissions(value, roles)

  const byDomain = new Map<string, string[]>()
  for (const permission of effective) {
    const domain = permissionDomain(permission)
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), permission])
  }

  const toggle = (slug: RoleSlug) => {
    if (value.includes(slug)) {
      if (lockedRoles.includes(slug)) return
      onChange(value.filter((role) => role !== slug))
    } else {
      onChange([...value, slug])
    }
  }

  const renderGroup = (category: 'basic' | 'domain', list: RoleDefinition[]) =>
    list.length > 0 && (
      <div className={styles.group}>
        <p className={styles.groupLabel}>{t(`settings:rights.category.${category}`)}</p>
        {list.map((role) => (
          <label key={role.slug} className={styles.option}>
            <input
              type="checkbox"
              checked={value.includes(role.slug)}
              disabled={lockedRoles.includes(role.slug)}
              onChange={() => toggle(role.slug)}
            />
            <span>
              <span className={styles.optionName}>
                {roleLabel(role.slug, t, roles)}
              </span>
              <span className={styles.optionHint}>{role.description}</span>
            </span>
          </label>
        ))}
      </div>
    )

  return (
    <Overlay
      title={t('settings:rights.detailTitle', {name: memberName})}
      onClose={onClose}
      variant="drawer"
      size="sm"
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {t('common:actions.done', 'Fertig')}
        </button>
      }
    >
      {renderGroup('basic', basics)}
      {renderGroup('domain', domains)}
      {lockedRoles.length > 0 && lockedReason && (
        <p className={styles.lockedHint}>{lockedReason}</p>
      )}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          {t('settings:rights.effectiveTitle')}
        </p>
        {effective.length === 0 ? (
          <p className="muted">{t('settings:rights.effectiveEmpty')}</p>
        ) : (
          [...byDomain.entries()].map(([domain, permissions]) => (
            <div key={domain}>
              <p className={styles.domainLabel}>{domain}</p>
              <ul className={styles.permissionList}>
                {permissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Overlay>
  )
}
