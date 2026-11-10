import { useEventMutations, useEventInventories, useInventoryCoverage } from '../../hooks/queries/useEvents'
import { useInventories } from '../../hooks/queries/useInventories'
import { formatDecimal, toNumber } from '../../lib/format'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import styles from '../EventDetailPage.module.css'

/**
 * Event inventories: which storages count for this event, and the
 * per-ingredient coverage (event demand vs. stocked amount). Missing amounts
 * must be bought — they should end up on a shopping tour.
 */
export function InventorySection({ eventId }: { eventId: number }) {
  const linked = useEventInventories(eventId)
  const all = useInventories()
  const coverage = useInventoryCoverage(eventId)
  const mutations = useEventMutations(eventId)

  const linkedIds = new Set((linked.data ?? []).map((inventory) => inventory.id))
  const linkable = (all.data ?? []).filter(
    (inventory) => !linkedIds.has(inventory.id),
  )

  return (
    <div className={`card ${styles.dayCard}`}>
      <div className={styles.dayHeader}>
        <h3 className="section-subtitle">{t('eventInventory.heading')}</h3>
        <span className="muted">{t('eventInventory.hint')}</span>
      </div>

      <div className={styles.tabToolbar}>
        <div className={styles.badges}>
          {(linked.data ?? []).map((inventory) => (
            <span key={inventory.id} className="badge badge--info">
              {inventory.name}
              <button
                type="button"
                className={styles.iconButton}
                title={t('eventInventory.unlink')}
                onClick={() => mutations.removeEventInventory.mutate(inventory.id)}
              >
                ✕
              </button>
            </span>
          ))}
          {linked.data && linked.data.length === 0 && (
            <span className="muted">{t('eventInventory.noneLinked')}</span>
          )}
        </div>
        <select
          className="input"
          value=""
          onChange={(event) => {
            const inventoryId = Number(event.target.value)
            if (inventoryId) mutations.addEventInventory.mutate(inventoryId)
          }}
        >
          <option value="">{t('eventInventory.link')}</option>
          {linkable.map((inventory) => (
            <option key={inventory.id} value={inventory.id}>
              {inventory.name}
            </option>
          ))}
        </select>
      </div>

      {coverage.isPending ? (
        <div className={styles.previewSkeleton}>
          <Skeleton height="0.8rem" />
          <Skeleton width="80%" height="0.8rem" />
          <Skeleton width="65%" height="0.8rem" />
        </div>
      ) : coverage.isError ? (
        <p className="secondary">
          {t('eventInventory.coverageError', { error: String(coverage.error) })}
        </p>
      ) : (coverage.data ?? []).length === 0 ? (
        <p className="muted">{t('eventInventory.nothingToCover')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('eventInventory.col.ingredient')}</th>
              <th className="num">{t('eventInventory.col.demand')}</th>
              <th className="num">{t('eventInventory.col.covered')}</th>
              <th className="num">{t('eventInventory.col.missing')}</th>
            </tr>
          </thead>
          <tbody>
            {(coverage.data ?? []).map((row) => {
              const demand = toNumber(row.demand_kg) ?? 0
              const covered = Math.min(toNumber(row.covered_kg) ?? 0, demand)
              const missing = Math.max(demand - covered, 0)
              return (
                <tr key={row.ingredient_id}>
                  <td>{row.ingredient_name}</td>
                  <td className="num">{formatDecimal(demand)} kg</td>
                  <td className={`num ${covered >= demand ? 'muted' : ''}`}>
                    {formatDecimal(covered)} kg
                  </td>
                  <td className={`num ${missing > 0 ? styles.over : 'muted'}`}>
                    {missing > 0 ? `${formatDecimal(missing)} kg` : '✓'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
