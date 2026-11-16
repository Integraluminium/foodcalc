import {Check, X} from "lucide-react";
import {useState} from 'react'
import type {Ingredient} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useIngredients} from '../../hooks/queries/useIngredients.ts'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {t} from '../../i18n'
import {formatDecimal} from '../../lib/format.ts'
import {IngredientDataDrawer} from './drawers/IngredientDataDrawer.tsx'
import {IngredientDrawer} from './view/IngredientView.tsx'

export default function IngredientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const ingredients = useIngredients({ search: debouncedSearch || undefined })
  const { ownerFilter, setOwnerFilter, filtered } = useFilteredList(ingredients.data)

  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const columns: DataTableColumn<Ingredient>[] = [
    { key: 'name', label: 'Name', render: (ing) => ing.name },
    {
      key: 'energy',
      label: 'Energie (kJ/g)',
      align: 'num',
      render: (ing) => formatDecimal(ing.energy, 2),
    },
    {
      key: 'cost',
      label: 'Kosten (€/g)',
      align: 'num',
      render: (ing) => formatDecimal(NaN, 2),
    },
    {
      key: 'sources',
      label: 'Hat Quellen',
      align: 'num',
      render: (ing) =>
        ing.has_sources ? (
          <Check size={16} className="text-success" />
        ) : (
          <X size={16} className="text-danger" />
        ),
    },
    {
      key: 'comment',
      label: 'Kommentar',
      className: 'secondary',
      render: (ing) => ing.comment || '–',
    },
  ]

  return (
    <ListPage
      title={t('nav.ingredients')}
      createLabel="+ Neue Zutat"
      onCreate={() => setCreateOpen(true)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('ingredient.searchPlaceholder')}
      ownerFilter={ownerFilter}
      onOwnerFilterChange={setOwnerFilter}
      columns={columns}
      rows={filtered}
      getRowKey={(ing) => ing.id}
      onRowClick={(ing) => setOpenId(ing.id)}
      isPending={ingredients.isPending}
      isError={ingredients.isError}
      error={ingredients.error}
      errorNoun="Zutaten"
      emptyMessage="Keine Zutaten gefunden. Lege die erste über „Neue Zutat“ an."
    >
      {openId !== null && (
        <IngredientDrawer id={openId} onClose={() => setOpenId(null)} />
      )}
      {createOpen && (
        <IngredientDataDrawer
          ingredient={null}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </ListPage>
  )
}