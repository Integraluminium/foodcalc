import { useState } from 'react'
import type { FormEvent } from 'react'
import { InventoryDrawer } from '../components/inventories/InventoryView'
import { ErrorState, EmptyState, LoadingState } from '../components/hub/StateViews'
import { Dialog } from '../components/ui/Dialog'
import {
  useCreateInventory,
  useInventories,
} from '../hooks/queries/useInventories'
import { useCurrentUser } from '../hooks/useAuth'
import { useActiveGroup } from '../hooks/useActiveGroup'
import { useGroups } from '../hooks/queries/useMasterData'
import { t } from '../i18n'
import styles from './InventoriesPage.module.css'

/**
 * Inventar-Hub: Karten mit Besitzer-Gruppe; Inspektion/Abgleich im
 * geteilten `InventoryDrawer` (Master-Detail).
 */
export default function InventoriesPage() {
  const inventories = useInventories()
  const { data: user } = useCurrentUser()
  const { activeGroupId, groups: userGroups } = useActiveGroup()
  const groups = useGroups()
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const groupName = (groupId: number) =>
    groups.data?.find((group) => group.id === groupId)?.name ??
    `Gruppe ${groupId}`

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">{t('nav.inventories')}</h1>
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
        <LoadingState />
      ) : inventories.isError ? (
        <ErrorState
          message={`Inventare konnten nicht geladen werden: ${String(inventories.error)}`}
        />
      ) : (inventories.data ?? []).length === 0 ? (
        <EmptyState message="Noch keine Inventare — lege das erste an." />
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
              <span className="muted">{groupName(inventory.group_id)}</span>
              <span className="muted">Bestand ansehen ›</span>
            </button>
          ))}
        </div>
      )}

      {openId !== null && (
        <InventoryDrawer inventoryId={openId} onClose={() => setOpenId(null)} />
      )}

      {createOpen && user && (
        <CreateInventoryDialog
          defaultGroupId={activeGroupId ?? userGroups[0]?.id ?? 0}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
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
            {create.isPending ? 'Anlegen…' : 'Anlegen'}
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
