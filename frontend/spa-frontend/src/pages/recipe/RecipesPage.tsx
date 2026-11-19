import {Layers, Utensils} from 'lucide-react'
import {type ReactNode, useState} from 'react'
import {useTranslation} from "react-i18next";
import {useNavigate} from 'react-router-dom'
import type {RecipeKind, RecipeListItem} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import {Drawer} from '../../components/patterns/drawer/Drawer.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {Badge} from '../../components/ui/badge/Badge.tsx'
import {SegmentedControl} from '../../components/ui/segmented_control/SegmentedControl.tsx'
import {useRecipes} from '../../hooks/queries/useRecipes.ts'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {formatKjPerG} from '../../lib/format.ts'
import {RecipeView} from './view/RecipeView.tsx'

type KindFilter = RecipeKind | 'all'

export const RecipeKindOptions: { value: KindFilter; label: string; icon?: ReactNode }[] = [
    { value: 'meal', label: 'Gerichte', icon: <Utensils size={16} /> },
    { value: 'component', label: 'Komponenten', icon: <Layers size={16} /> },
    { value: 'all', label: 'Alle' },
]

export default function RecipesPage() {
    const {t} = useTranslation(["recipes", "nav", "common"])
    const navigate = useNavigate()
    const [kind, setKind] = useState<KindFilter>('meal')
    const [drawerRecipe, setDrawerRecipe] = useState<RecipeListItem | null>(null)

    // Server handles text search; useFilteredList handles search state + client-side owner filter
    const { search, setSearch, ownerFilter, setOwnerFilter, filtered } =
      useFilteredList<RecipeListItem>(undefined)
    const debouncedSearch = useDebouncedValue(search)

    const recipes = useRecipes({
        kind: kind === 'all' ? undefined : kind,
        search: debouncedSearch || undefined,
    })

    // Apply owner filter to server results
    const { filtered: rows } = useFilteredList(recipes.data)

    const columns: DataTableColumn<RecipeListItem>[] = [
        { key: 'name', label: 'Name', render: (recipe) => recipe.name },
        {
            key: 'kind',
            label: 'Typ',
            render: (recipe) => (
              <Badge variant={recipe.kind === 'meal' ? 'success' : 'info'}>
                  {recipe.kind === 'meal' ? t('recipes:detail.kind.meal') : t('recipes:detail.kind.component')}
              </Badge>
            ),
        },
        {
            key: 'comment',
            label: 'Kommentar',
            className: 'muted',
            render: (recipe) => recipe.comment ?? '–',
        },
        {
            key: 'owner',
            label: 'Besitzer',
            className: 'secondary',
            render: (recipe) => recipe.group_name,
        },
        {
            key: 'energy',
            label: 'Energie',
            align: 'num',
            render: (recipe) => formatKjPerG(recipe.energy_kj_per_g),
        },
    ]

    return (
      <ListPage
        title={t('nav:recipes')}
        createLabel="+ Neues Rezept"
        onCreate={() => void navigate('/recipes/new')}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('recipes:list.searchPlaceholder')}
        extraFilters={
            <SegmentedControl
              options={RecipeKindOptions}
              value={kind}
              onChange={setKind}
              ariaLabel={t('recipes:list.filterKind')}
            />
        }
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        canCreateNew={true}
        columns={columns}
        rows={rows}
        getRowKey={(recipe) => recipe.id}
        onRowClick={setDrawerRecipe}
        isPending={recipes.isPending}
        isError={recipes.isError}
        error={recipes.error}
        errorNoun="Rezepte"
        emptyMessage={
            (recipes.data?.length ?? 0) > 0
              ? 'Keine Rezepte für diesen Filter.'
              : 'Keine Rezepte gefunden. Lege das erste über „Neues Rezept“ an.'
        }
      >
          {drawerRecipe && (
            <Drawer
              title={drawerRecipe.name}
              onClose={() => setDrawerRecipe(null)}
            >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <Badge variant={drawerRecipe.kind === 'meal' ? 'success' : 'info'}>
                        {drawerRecipe.kind === 'meal'
                          ? t('recipes:detail.kind.meal')
                          : t('recipes:detail.kind.component')}
                    </Badge>
                    <span className="muted">Owner: {drawerRecipe.group_name}</span>
                </div>
                <RecipeView
                  recipeId={drawerRecipe.id}
                  variant="overlay"
                  onDeleted={() => setDrawerRecipe(null)}
                />
            </Drawer>
          )}
      </ListPage>
    )
}