import { t } from '../../i18n'

/**
 * Status vocabulary for event ingredient management (By Meal / Combined /
 * By Source). The same three states + "unknown" are used everywhere.
 */
export type IngredientStatus = 'available' | 'planned' | 'missing' | 'unknown'

const CLASS_BY_STATUS = {
  available: 'badge--success',
  planned: 'badge--info',
  missing: 'badge--warning',
  unknown: 'badge--neutral',
} as const

const LABEL_KEY_BY_STATUS = {
  available: 'status.available',
  planned: 'status.planned',
  missing: 'status.missing',
  unknown: 'status.unknown',
} as const

export function StatusBadge({
  status,
  title,
}: {
  status: IngredientStatus
  /** Optional explanation, e.g. "in Storage 1" / "not covered by any tour". */
  title?: string
}) {
  return (
    <span className={`badge ${CLASS_BY_STATUS[status]}`} title={title}>
      {t(LABEL_KEY_BY_STATUS[status])}
    </span>
  )
}
