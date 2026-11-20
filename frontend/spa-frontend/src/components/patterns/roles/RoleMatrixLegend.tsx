import {useTranslation} from 'react-i18next'
import type {RoleDefinition} from '../../../api'
import {Badge} from '../../ui/badge/Badge.tsx'
import styles from './RoleMatrixLegend.module.css'

export interface RoleMatrixLegendProps {
  /** The backend role catalog (`GET /api/roles`). */
  roles: RoleDefinition[] | undefined
  defaultExpanded?: boolean
}

/**
 * Collapsible "who may do what?" legend rendered from the catalog. Adding a
 * role in Rust extends this legend automatically — no frontend change.
 */
export function RoleMatrixLegend({roles, defaultExpanded = false}: RoleMatrixLegendProps) {
  const {t} = useTranslation(['settings', 'common'])
  if (!roles || roles.length === 0) return null

  return (
    <details className={styles.legend} open={defaultExpanded}>
      <summary className={styles.summary}>
        {t('settings:rights.matrixTitle', 'Rollen-Matrix: wer darf was?')}
      </summary>
      <div className={styles.grid}>
        {roles.map((role) => (
          <div key={role.slug} className={styles.card}>
            <span className={styles.headerRow}>
              <Badge variant="info">{t(`common:roles.${role.slug}`, {defaultValue: role.name})}</Badge>
              <Badge variant="neutral">{t(`settings:rights.category.${role.category}`)}</Badge>
            </span>
            <span className={styles.description}>{role.description}</span>
            <span className={styles.permissions}>{role.permissions.join(' · ')}</span>
          </div>
        ))}
      </div>
    </details>
  )
}
