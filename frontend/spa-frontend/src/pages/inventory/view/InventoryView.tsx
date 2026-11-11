import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Inventory, InventoryItemWithName } from '../../../api/types.ts'
import {
  useInventory,
  useInventoryItems,
  useInventoryMutations,
} from '../../../hooks/queries/useInventories.ts'
import { useIngredients } from '../../../hooks/queries/useIngredients.ts'
import { usePermissions } from '../../../hooks/usePermissions.ts'
import { formatDecimal, toNumber } from '../../../lib/format.ts'
import { ConfirmDialog } from '../../../components/ui/dialog/ConfirmDialog.tsx'
import { Drawer } from '../../../components/ui/drawer/Drawer.tsx'
import { SegmentedControl } from '../../../components/ui/segented_control/SegmentedControl.tsx'
import { Spinner } from '../../../components/ui/spinner/Spinner.tsx'
import styles from './InventoryView.module.css'

export type InventoryMutations = ReturnType<typeof useInventoryMutations>

type ItemMode = 'edit' | 'reconcile'

const MODE_OPTIONS: { value: ItemMode; label: string }[] = [
  { value: 'edit', label: 'Bearbeiten' },
  { value: 'reconcile', label: 'Abgleichen' },
]

/**
 * Inventar-Inspektion (UI_Spec §4 „Inventory Reconciliation"): Bestandsliste
 * im Bearbeiten-Modus (freie Mengen) oder Abgleich-Modus — Schnellkorrektur
 * per ±-Stepper und Differenzeingabe, weil physischer Bestand nie exakt ist.
 */
export function InventoryDrawer({
  inventoryId,
  onClose,
}: {
  inventoryId: number
  onClose: () => void
}) {
  const inventory = useInventory(inventoryId)
  const data = inventory.data

  return (
    <Drawer title={data?.name ?? 'Inventar'} onClose={onClose}>
      {inventory.isPending ? (
        <Spinner />
      ) : inventory.isError || !data ? (
        <p className="secondary">
          Inventar konnte nicht geladen werden: {String(inventory.error)}
        </p>
      ) : (
        <InventoryContent inventory={data} onClose={onClose} />
      )}
    </Drawer>
  )
}

function InventoryContent({
  inventory,
  onClose,
}: {
  inventory: Inventory
  onClose: () => void
}) {
  const items = useInventoryItems(inventory.id)
  const mutations = useInventoryMutations(inventory.id)
  const ingredients = useIngredients('')
  const { canEditGroup } = usePermissions()
  const editable = canEditGroup(inventory.group_id)
  const [mode, setMode] = useState<ItemMode>('edit')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const addItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const ingredientId = Number(data.get('ingredient_id') ?? 0)
    const amount = String(data.get('amount') ?? '')
    if (!ingredientId || !amount) return
    mutations.addItem.mutate(
      { ingredient_id: ingredientId, amount },
      { onSuccess: () => event.currentTarget.reset() },
    )
  }

  return (
    <>
      <p className="muted">
        Lagerort für Zutaten. Kopplung an Events deckt einen Teil des
        Event-Bedarfs ab.
      </p>

      <div className={styles.modeRow}>
        {editable ? (
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            ariaLabel="Bestandsmodus wählen"
          />
        ) : (
          <span className="muted">Keine Bearbeitungsrechte für diese Gruppe.</span>
        )}
      </div>

      {items.isPending ? (
        <Spinner />
      ) : items.isError ? (
        <p className="secondary">
          Bestand konnte nicht geladen werden: {String(items.error)}
        </p>
      ) : (items.data ?? []).length === 0 ? (
        <p className="muted">Noch keine Zutaten eingelagert.</p>
      ) : mode === 'reconcile' && editable ? (
        <div className={styles.reconcileList}>
          {(items.data ?? []).map((item) => (
            <ReconcileCard
              key={item.ingredient_id}
              item={item}
              mutations={mutations}
            />
          ))}
        </div>
      ) : (
        <div className={styles.scrollX}>
          <table className="table">
          <thead>
            <tr>
              <th>Zutat</th>
              <th className="num">Menge (kg)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(items.data ?? []).map((item) => (
              <ItemRow
                key={item.ingredient_id}
                item={item}
                editable={editable}
                mutations={mutations}
              />
            ))}
          </tbody>
          </table>
        </div>
      )}

      {editable && mode === 'edit' && (
        <form className={styles.addRow} onSubmit={addItem}>
          <select className="input" name="ingredient_id" required>
            <option value="">Zutat wählen…</option>
            {(ingredients.data ?? []).map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
          <input
            className={`input ${styles.amountInput}`}
            name="amount"
            type="number"
            min="0"
            step="any"
            placeholder="kg"
            required
          />
          <button
            type="submit"
            className="btn btn--ghost"
            disabled={mutations.addItem.isPending}
          >
            + Einlagern
          </button>
        </form>
      )}

      {editable && (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => setConfirmDelete(true)}
        >
          Inventar löschen
        </button>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Inventar löschen"
          message={`„${inventory.name}" inklusive aller gelagerten Mengen wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, { onSuccess: onClose })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </>
  )
}

function ItemRow({
  item,
  editable,
  mutations,
}: {
  item: InventoryItemWithName
  editable: boolean
  mutations: InventoryMutations
}) {
  return (
    <tr key={item.ingredient_id}>
      <td>{item.name}</td>
      <td className="num">
        {editable ? (
          <input
            className={`input ${styles.amountInput}`}
            type="number"
            min="0"
            step="any"
            defaultValue={String(toNumber(item.amount) ?? 0)}
            onBlur={(event) => {
              const value = event.target.value
              const current = String(toNumber(item.amount) ?? 0)
              if (value !== current && value !== '') {
                mutations.updateItem.mutate({
                  ingredientId: item.ingredient_id,
                  amount: value,
                })
              }
            }}
          />
        ) : (
          formatDecimal(item.amount)
        )}
      </td>
      <td className="num">
        {editable && (
          <button
            type="button"
            className="btn btn--ghost"
            title="Aus Bestand entfernen"
            onClick={() => mutations.removeItem.mutate(item.ingredient_id)}
          >
            🗑
          </button>
        )}
      </td>
    </tr>
  )
}

/**
 * Reconciliation card: header (name + stock), quick ±-steppers and the
 * difference input stack vertically — no table columns to overflow on
 * narrow screens.
 */
function ReconcileCard({
  item,
  mutations,
}: {
  item: InventoryItemWithName
  mutations: InventoryMutations
}) {
  const current = toNumber(item.amount) ?? 0
  const [delta, setDelta] = useState('')

  const commitDelta = (value: number) => {
    const next = Math.max(Math.round((current + value) * 1000) / 1000, 0)
    if (next !== current) {
      mutations.updateItem.mutate({
        ingredientId: item.ingredient_id,
        amount: String(next),
      })
    }
  }

  const applyDelta = () => {
    const value = Number(delta.replace(',', '.'))
    if (delta.trim() !== '' && Number.isFinite(value)) {
      commitDelta(value)
      setDelta('')
    }
  }

  return (
    <div className={styles.reconcileCard}>
      <div className={styles.reconcileHeader}>
        <span className={styles.reconcileName}>{item.name}</span>
        <span className={styles.reconcileAmount}>
          {formatDecimal(current)} kg
        </span>
      </div>
      <div className={styles.quick}>
        <button type="button" onClick={() => commitDelta(-1)}>
          −1
        </button>
        <button type="button" onClick={() => commitDelta(-0.1)}>
          −0,1
        </button>
        <button type="button" onClick={() => commitDelta(0.1)}>
          +0,1
        </button>
        <button type="button" onClick={() => commitDelta(1)}>
          +1
        </button>
      </div>
      <div className={styles.deltaCell}>
        <input
          className={`input ${styles.deltaInput}`}
          type="number"
          step="any"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applyDelta()
            }
          }}
          placeholder="±kg"
          aria-label={`Differenz für ${item.name}`}
        />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={applyDelta}
          disabled={delta.trim() === ''}
        >
          Übernehmen
        </button>
      </div>
    </div>
  )
}
