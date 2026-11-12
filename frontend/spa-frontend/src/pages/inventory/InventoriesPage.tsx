import type {FormEvent} from 'react'
import {useMemo, useState} from 'react'
import {InventoryDrawer} from './view/InventoryView.tsx'
import {EmptyState, ErrorState, LoadingState} from '../../components/layout/state_views/StateViews.tsx'
import {useCreateInventory, useInventories,} from '../../hooks/queries/useInventories.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {useActiveGroup} from '../../hooks/useActiveGroup.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {t} from '../../i18n'
import styles from './InventoriesPage.module.css'
import { Drawer } from '../../components/patterns/drawer/Drawer.tsx'
import {useNavigate} from "react-router-dom";


type OwnerFilter = number | 'all' | null

/**
 *
 * Inventar-Hub: Karten mit Besitzer-Gruppe; Inspektion/Abgleich im
 * geteilten `InventoryDrawer` (Master-Detail).
 */
export default function InventoriesPage() {
  useNavigate();
  const inventories = useInventories()
  const { data: user } = useCurrentUser()
  const { activeGroupId, groups: userGroups } = useActiveGroup()
  const groups = useGroups()
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const [ownerOverride, setOwnerOverride] = useState<OwnerFilter>(null)
  const ownerFilter: OwnerFilter = ownerOverride ?? activeGroupId ?? 'all'
  const [search, setSearch] = useState('')


  const filtered = useMemo(
      () =>
          (inventories.data ?? []).filter(
              (recipe) =>
                  ownerFilter === 'all' || recipe.group_id === ownerFilter,
          ),
      [inventories.data, ownerFilter],
  )

  return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className="section-title">{t('nav.recipes')}</h1>
          <button
              type="button"
              className="btn btn--primary"
              onClick={() => setCreateOpen(true)}
          >
            + Neues Inventar
          </button>
        </div>

        <div className={styles.controls}>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <select
                className={`input ${styles.ownerFilter}`}
                value={ownerFilter === 'all' ? 'all' : String(ownerFilter)}
                onChange={(event) => {
                  const raw = event.target.value
                  setOwnerOverride(raw === 'all' ? 'all' : Number(raw))
                }}
                aria-label="Nach Besitzer-Gruppe filtern"
            >
              <option value="all">Alle Gruppen</option>
              {userGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ' (persönlich)' : ''}
                  </option>
              ))}
            </select>


          </div>

          <input
              className={`input ${styles.search}`}
              placeholder="Rezepte durchsuchen…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={`card ${styles.panel}`}>
          {inventories.isPending ? (
              <LoadingState/>
          ) : inventories.isError ? (
              <ErrorState
                  message={`Rezepte konnten nicht geladen werden: ${String(inventories.error)}`}
              />
          ) : filtered.length === 0 ? (
              <EmptyState
                  message={
                    inventories.data && inventories.data.length > 0
                        ? 'Keine Rezepte für diesen Filter.'
                        : 'Keine Rezepte gefunden. Lege das erste über „Neues Rezept“ an.'
                  }
              />
          ) : (
              <table className="table">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Typ</th>
                  <th>Kommentar</th>
                  <th>Besitzer</th>
                  <th className="num">Energie</th>
                  <th/>
                </tr>
                </thead>
                <tbody>
                {filtered.map((inventory) => (
                    <tr
                        key={inventory.id}
                        className={styles.row}
                        // onClick={() => setDrawerRecipe(inventory)}
                    >
                      <td>{inventory.name}</td>
                      <td>
                    <span
                        className={`badge badge--success`}
                    >
                    </span>
                      </td>
                      <td className="num muted">›</td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </div>

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
    <Drawer
      title="Neues Inventar"
      onClose={onClose}
      // footer={
      //   <>
      //     <button type="button" className="btn btn--ghost" onClick={onClose}>
      //       Abbrechen
      //     </button>
      //     <button
      //       type="submit"
      //       form="create-inventory-form"
      //       className="btn btn--primary"
      //       disabled={create.isPending}
      //     >
      //       {create.isPending ? 'Anlegen…' : 'Anlegen'}
      //     </button>
      //   </>
      // }
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
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
      </div>
    </Drawer>
  )
}
