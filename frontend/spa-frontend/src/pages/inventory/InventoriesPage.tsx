import type {FormEvent} from 'react'
import {useMemo, useState} from 'react'
import type {Inventory} from '../../api/types.ts'
import {Drawer} from '../../components/patterns/drawer/Drawer.tsx'
import SearchBar from "../../components/patterns/seachbar/SearchBar.tsx";
import {DataTable, type DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useCreateInventory, useInventories} from '../../hooks/queries/useInventories.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {useOwnerFilter} from '../../hooks/useOwnerFilter.ts'
import {t} from '../../i18n'
import styles from './InventoriesPage.module.css'
import {InventoryDrawer} from './view/InventoryView.tsx'

/**
 * Inventar-Hub (UI_Spec §3.2): Data-Grid mit Besitzer-Gruppe; Inspektion und
 * Bestands-Abgleich („Reconciliation Mode“) im geteilten `InventoryDrawer`
 * (Master-Detail).
 */
export default function InventoriesPage() {
    const inventories = useInventories()
    const {data: user} = useCurrentUser()
    const userGroups = user?.groups ?? []
    const personalGroupId =
        user?.groups.find((group) => group.is_personal)?.id ??
        user?.groups[0]?.id ??
        0
    const groups = useGroups()
    const {ownerFilter, setOwnerFilter, matches} = useOwnerFilter()
    const [search, setSearch] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const [openId, setOpenId] = useState<number | null>(null)

    const filtered = useMemo(
        () =>
            (inventories.data ?? [])
                .filter(matches)
                .filter((inventory) =>
                    inventory.name.toLowerCase().includes(search.trim().toLowerCase()),
                ),
        [inventories.data, matches, search],
    )

    const groupNameOf = (groupId: number) =>
        groups.data?.find((group) => group.id === groupId)?.name ??
        t('overview.groupFallback', {id: groupId})

    const columns: DataTableColumn<Inventory>[] = [
        {key: 'name', label: 'Name', render: (inventory) => inventory.name},
        {
            key: 'owner',
            label: 'Besitzer',
            className: 'secondary',
            render: (inventory) => groupNameOf(inventory.group_id),
        },
    ]

    const emptyMessage =
        inventories.data && inventories.data.length > 0
            ? 'Keine Inventare für diesen Filter.'
            : 'Keine Inventare gefunden. Lege das erste über „Neues Inventar“ an.'

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

            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} userGroups={userGroups} ownerFilter={ownerFilter} onChange1={setOwnerFilter} placeholder1="Inventare durchsuchen…"/>

            <DataTable
                columns={columns}
                rows={filtered}
                getRowKey={(inventory) => inventory.id}
                onRowClick={(inventory) => setOpenId(inventory.id)}
                isPending={inventories.isPending}
                isError={inventories.isError}
                error={inventories.error}
                errorNoun="Inventare"
                emptyMessage={emptyMessage}
                withChevron
            />

            {openId !== null && (
                <InventoryDrawer inventoryId={openId} onClose={() => setOpenId(null)}/>
            )}

            {createOpen && user && (
                <CreateInventoryDialog
                    defaultGroupId={personalGroupId}
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
            {onSuccess: onClose},
        )
    }

    return (
        <Drawer
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
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                    <label className="field">
                        Name
                        <input className="input" name="name" required autoFocus/>
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
        </Drawer>
    )
}
