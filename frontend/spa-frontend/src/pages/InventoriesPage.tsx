import { useState } from 'react'
import type { FormEvent } from 'react'
import { Dialog } from '../components/ui/Dialog'
import { Drawer } from '../components/ui/Drawer'
import { Spinner } from '../components/ui/Spinner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  useCreateInventory,
  useInventories,
  useInventory,
  useInventoryItems,
  useInventoryMutations,
} from '../hooks/queries/useInventories'
import { useIngredients } from '../hooks/queries/useIngredients'
import { useCurrentUser } from '../hooks/useAuth'
import { useGroups } from '../hooks/queries/useMasterData'
import { toNumber } from '../lib/format'
import styles from './InventoriesPage.module.css'

export default function InventoriesPage() {
  const inventories = useInventories()
  const { data: user } = useCurrentUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const openInventory = useInventory(openId ?? 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Inventare</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          + Neues Inventar
        </button>
      </div>
      <p className="muted">
        Lagerorte für Zutaten. Inventare können an Events gekoppelt werden —
        ihr Bestand deckt dann einen Teil des Event-Bedarfs ab.
      </p>

      {inventories.isPending ? (
        <div className={styles.empty}>
          <Spinner />
        </div>
      ) : inventories.isError ? (
        <p className="secondary">
          Inventare konnten nicht geladen werden: {String(inventories.error)}
        </p>
      ) : (inventories.data ?? []).length === 0 ? (
        <div className={styles.empty}>
          <p className="secondary">Noch keine Inventare — lege das erste an.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {(inventories.data ?? []).map((inventory) => (
            <button
              key={inventory.id}
              type="button"
              className={`card ${styles.cardButton}`}
              onClick={() => setOpenId(inventory.id)}
            >
              <span className={styles.cardName}>{inventory.name}</span>
              <span className="muted">Bestand ansehen ›</span>
            </button>
          ))}
        </div>
      )}

      {openId !== null && (
        <InventoryDrawer
          inventoryId={openId}
          name={openInventory.data?.name ?? `Inventar ${openId}`}
          onClose={() => setOpenId(null)}
        />
      )}

      {createOpen && user && (
        <CreateInventoryDialog
          defaultGroupId={user.groups[0]?.id ?? 0}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}

/** Inventory detail drawer: item list with inline amount editing. */
function InventoryDrawer({
  inventoryId,
  name,
  onClose,
}: {
  inventoryId: number
  name: string
  onClose: () => void
}) {
  const items = useInventoryItems(inventoryId)
  const mutations = useInventoryMutations(inventoryId)
  const ingredients = useIngredients('')
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
    <Drawer title={name} onClose={onClose}>
      {items.isPending ? (
        <Spinner />
      ) : items.isError ? (
        <p className="secondary">
          Bestand konnte nicht geladen werden: {String(items.error)}
        </p>
      ) : (items.data ?? []).length === 0 ? (
        <p className="muted">Noch keine Zutaten eingelagert.</p>
      ) : (
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
              <tr key={item.ingredient_id}>
                <td>{item.name}</td>
                <td className="num">
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
                </td>
                <td className="num">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    title="Aus Bestand entfernen"
                    onClick={() => mutations.removeItem.mutate(item.ingredient_id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

      <button
        type="button"
        className="btn btn--danger"
        onClick={() => setConfirmDelete(true)}
      >
        Inventar löschen
      </button>
      {confirmDelete && (
        <ConfirmDialog
          title="Inventar löschen"
          message={`„${name}" inklusive aller gelagerten Mengen wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, { onSuccess: onClose })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </Drawer>
  )
}

function CreateInventoryDialog({
  defaultGroupId,
  onClose,
}: {
  defaultGroupId: number
  onClose: () => void
}) {
  const groups = useGroups()
  const create = useCreateInventory()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        group_id:
          Number(data.get('group_id') ?? defaultGroupId) || defaultGroupId,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Neues Inventar"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="create-inventory-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? <Spinner size="sm" /> : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-inventory-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus />
          </label>
          <label className="field">
            Owner-Gruppe
            <select
              className="input"
              name="group_id"
              defaultValue={defaultGroupId}
            >
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {group.is_personal ? ' (persönlich)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Dialog>
  )
}
