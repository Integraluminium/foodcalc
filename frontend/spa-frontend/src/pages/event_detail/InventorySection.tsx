import { useEventMutations, useEventInventories, useInventoryCoverage } from '../../hooks/queries/useEvents'
import { useInventories } from '../../hooks/queries/useInventories'
import { formatDecimal, toNumber } from '../../lib/format'
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
        <h3 className="section-subtitle">Inventare</h3>
        <span className="muted">
          Bestände, die für dieses Event einplane werden — die Tabelle zeigt
          pro Zutat, was abgedeckt ist und was noch gekauft werden muss.
        </span>
      </div>

      <div className={styles.tabToolbar}>
        <div className={styles.badges}>
          {(linked.data ?? []).map((inventory) => (
            <span key={inventory.id} className="badge badge--info">
              {inventory.name}
              <button
                type="button"
                className={styles.iconButton}
                title="Inventar vom Event abkoppeln"
                onClick={() => mutations.removeEventInventory.mutate(inventory.id)}
              >
                ✕
              </button>
            </span>
          ))}
          {linked.data && linked.data.length === 0 && (
            <span className="muted">Noch keine Inventare gekoppelt.</span>
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
          <option value="">Inventar koppeln…</option>
          {linkable.map((inventory) => (
            <option key={inventory.id} value={inventory.id}>
              {inventory.name}
            </option>
          ))}
        </select>
      </div>

      {coverage.isPending ? (
        <p className="muted">Abdeckung wird berechnet…</p>
      ) : coverage.isError ? (
        <p className="secondary">
          Abdeckung konnte nicht geladen werden: {String(coverage.error)}
        </p>
      ) : (coverage.data ?? []).length === 0 ? (
        <p className="muted">
          Keine Zutaten im Speiseplan — es gibt nichts abzudecken.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Zutat</th>
              <th className="num">Bedarf</th>
              <th className="num">Abgedeckt</th>
              <th className="num">Fehlt</th>
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
