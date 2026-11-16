// src/pages/event/workspace/shopping/InventorySection.tsx
import {Check, X} from 'lucide-react'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Skeleton} from '../../../../components/patterns/skeleton/Skeleton.tsx'
import {ErrorState} from '../../../../components/patterns/state_views/StateViews.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {useEventInventories, useEventMutations, useInventoryCoverage,} from '../../../../hooks/queries/useEvents.ts'
import {useInventories} from '../../../../hooks/queries/useInventories.ts'
import {t} from '../../../../i18n'
import {formatDecimal, toNumber} from '../../../../lib/format.ts'
import styles from '../EventDetailPage.module.css'

export function InventorySection({ eventId }: { eventId: number }) {
  const linked = useEventInventories(eventId)
  const all = useInventories()
  const coverage = useInventoryCoverage(eventId)
  const mutations = useEventMutations(eventId)

  const linkedIds = new Set((linked.data ?? []).map((inv) => inv.id))
  const linkable = (all.data ?? []).filter((inv) => !linkedIds.has(inv.id))

  return (
    <CardSection
      title={t('eventInventory.heading')}
      subtitle={t('eventInventory.hint')}
    >
      <div className="tab-toolbar" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="row-actions">
          {(linked.data ?? []).map((inv) => (
            <Badge key={inv.id} variant="info">
              {inv.name}
              <button
                type="button"
                className="icon-btn"
                title={t('eventInventory.unlink')}
                onClick={() => mutations.removeEventInventory.mutate(inv.id)}
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
          {linked.data && linked.data.length === 0 && (
            <span className="muted">{t('eventInventory.noneLinked')}</span>
          )}
        </div>

        <select
          className="input"
          value=""
          onChange={(e) => {
            const inventoryId = Number(e.target.value)
            if (inventoryId) mutations.addEventInventory.mutate(inventoryId)
          }}
        >
          <option value="">{t('eventInventory.link')}</option>
          {linkable.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.name}
            </option>
          ))}
        </select>
      </div>

      {coverage.isPending ? (
        <div className="form-stack">
          <Skeleton height="0.8rem" />
          <Skeleton width="80%" height="0.8rem" />
        </div>
      ) : coverage.isError ? (
        <ErrorState message={t('eventInventory.heading') + ': ' + coverage.error} />
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
                  {missing > 0 ? `${formatDecimal(missing)} kg` : <Check size={15} />}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      )}
    </CardSection>
  )
}