import {t} from "i18next";
import {useState} from 'react'
import type {Inventory} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useGroupName} from '../../hooks/queries/useGroupName.ts'
import {useInventories} from '../../hooks/queries/useInventories.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {CreateInventoryDrawer} from "./drawer/CreateInventoryDrawer.tsx";
import {InventoryDrawer} from './view/InventoryView.tsx'

export default function InventoriesPage() {
    const inventories = useInventories()
    const groupName = useGroupName()
    const { search, setSearch, ownerFilter, setOwnerFilter, filtered } =
      useFilteredList(inventories.data, (inv) => inv.name)

    const [createOpen, setCreateOpen] = useState(false)
    const [openId, setOpenId] = useState<number | null>(null)

    const columns: DataTableColumn<Inventory>[] = [
        { key: 'name', label: 'Name', render: (inv) => inv.name },
        {
            key: 'owner',
            label: 'Besitzer',
            className: 'secondary',
            render: (inv) => groupName(inv.group_id),
        },
    ]

    return (
      <ListPage
        title={t('nav:inventories')}
        createLabel={t('inventories:titleNew')}
        onCreate={() => setCreateOpen(true)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('inventories:searchPlaceholder')}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        canCreateNew={true}
        columns={columns}
        rows={filtered}
        getRowKey={(inv) => inv.id}
        onRowClick={(inv) => setOpenId(inv.id)}
        isPending={inventories.isPending}
        isError={inventories.isError}
        error={inventories.error}
        errorNoun="Inventare"
        emptyMessage={
            (inventories.data?.length ?? 0) > 0
              ? 'Keine Inventare für diesen Filter.'
              : 'Keine Inventare gefunden. Lege das erste über „Neues Inventar“ an.'
        }
      >
          {openId !== null && (
            <InventoryDrawer inventoryId={openId} onClose={() => setOpenId(null)} />
          )}
          {createOpen && (
            <CreateInventoryDrawer onClose={() => setCreateOpen(false)} />
          )}
      </ListPage>
    )
}
