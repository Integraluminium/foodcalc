import {useMemo, useState} from 'react'
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
import {SegmentedControl} from "../components/ui/SegmentedControl.tsx";
import {formatKjPerG} from "../lib/format.ts";
import {Drawer} from "../components/ui/Drawer.tsx";
import {RecipeView} from "../components/recipes/RecipeView.tsx";
import {useRecipes} from "../hooks/queries/useRecipes.ts";
import {useNavigate} from "react-router-dom";


type OwnerFilter = number | 'all' | null

/**
 *
 * Inventar-Hub: Karten mit Besitzer-Gruppe; Inspektion/Abgleich im
 * geteilten `InventoryDrawer` (Master-Detail).
 */
export default function InventoriesPage() {
  const navigate = useNavigate()
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


  const groupName = (groupId: number) =>
    groups.data?.find((group) => group.id === groupId)?.name ??
    `Gruppe ${groupId}`

  // return (
  //   <div className={styles.page}>
  //     <div className={styles.header}>
  //       <h1 className="section-title">{t('nav.inventories')}</h1>
  //       <button
  //         type="button"
  //         className="btn btn--primary"
  //         onClick={() => setCreateOpen(true)}
  //       >
  //         + Neues Inventar
  //       </button>
  //     </div>
  //     <p className="muted">
  //       Lagerorte für Zutaten. Inventare können an Events gekoppelt werden —
  //       ihr Bestand deckt dann einen Teil des Event-Bedarfs ab.
  //     </p>
  //
  //     {inventories.isPending ? (
  //       <LoadingState />
  //     ) : inventories.isError ? (
  //       <ErrorState
  //         message={`Inventare konnten nicht geladen werden: ${String(inventories.error)}`}
  //       />
  //     ) : (inventories.data ?? []).length === 0 ? (
  //       <EmptyState message="Noch keine Inventare — lege das erste an." />
  //     ) : (
  //       <div className={styles.grid}>
  //         {(inventories.data ?? []).map((inventory) => (
  //           <button
  //             key={inventory.id}
  //             type="button"
  //             className={`card ${styles.cardButton}`}
  //             onClick={() => setOpenId(inventory.id)}
  //           >
  //             <span className={styles.cardName}>{inventory.name}</span>
  //             <span className="muted">{groupName(inventory.group_id)}</span>
  //             <span className="muted">Bestand ansehen ›</span>
  //           </button>
  //         ))}
  //       </div>
  //     )}
  //
  //     {openId !== null && (
  //       <InventoryDrawer inventoryId={openId} onClose={() => setOpenId(null)} />
  //     )}
  //
  //     {createOpen && user && (
  //       <CreateInventoryDialog
  //         defaultGroupId={activeGroupId ?? userGroups[0]?.id ?? 0}
  //         onClose={() => setCreateOpen(false)}
  //       />
  //     )}
  //   </div>
  // )

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
            {/*<SegmentedControl*/}
            {/*    options={KIND_OPTIONS}*/}
            {/*    value={kind}*/}
            {/*    onChange={setKind}*/}
            {/*    ariaLabel="Rezeptart filtern"*/}
            {/*/>*/}

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
