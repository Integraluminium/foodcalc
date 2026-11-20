import {Check, X} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {Ingredient} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {Badge} from '../../components/ui/badge/Badge.tsx'
import {useIngredients} from '../../hooks/queries/useIngredients.ts'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {formatDecimal} from '../../lib/format.ts'
import {IngredientDataDrawer} from './drawers/IngredientDataDrawer.tsx'
import {IngredientDrawer} from './view/IngredientView.tsx'

export default function IngredientsPage() {
  const { t } = useTranslation([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const ingredients = useIngredients({ search: debouncedSearch || undefined })
  const { ownerFilter, setOwnerFilter, filtered } = useFilteredList(ingredients.data)

  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const columns: DataTableColumn<Ingredient>[] = [
    { key: 'name', label: t('ingredients:detail.name'), render: (ing) => ing.name },
    {
      key: 'energy',
      label: t('ingredients:detail.energy'),
      align: 'num',
      render: (ing) => formatDecimal(ing.energy, 2),
    },
    {
      key: 'cost',
      label: 'Kosten (€/g)',
      align: 'num',
      render: () => formatDecimal(NaN, 2),
    },
    {
      key: 'sources',
      label: t('ingredients:detail.hasSources'),
      align: 'num',
      render: (ing) =>
        ing.has_sources ? (
          <Badge variant="success">
            <Check size={14} aria-label={t('common:yes')} />
          </Badge>
        ) : (
          <Badge variant="neutral">
            <X size={14} aria-label={t('common:no')} />
          </Badge>
        ),
    },
    {
      key: 'comment',
      label: t('recipes:drawers.comment'),
      className: 'secondary',
      render: (ing) => ing.comment || '–',
    },
  ]

  return (
    <ListPage
      title={t('nav:ingredients')}
      createLabel={`+ ${t('ingredients:list.createTitle')}`}
      onCreate={() => setCreateOpen(true)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('ingredients:list.searchPlaceholder')}
      ownerFilter={ownerFilter}
      onOwnerFilterChange={setOwnerFilter}
      canCreateNew={true}
      columns={columns}
      rows={filtered}
      getRowKey={(ing) => ing.id}
      onRowClick={(ing) => setOpenId(ing.id)}
      isPending={ingredients.isPending}
      isError={ingredients.isError}
      error={ingredients.error}
      errorNoun={t('nav:ingredients')}
      emptyMessage={t(
        'ingredients:list.empty')}
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