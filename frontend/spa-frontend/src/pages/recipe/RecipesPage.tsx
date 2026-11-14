import {type ReactNode, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import type {RecipeKind, RecipeListItem} from '../../api/types.ts'
import {Drawer} from '../../components/patterns/drawer/Drawer.tsx'
import SearchBar from "../../components/patterns/seachbar/SearchBar.tsx";
import {DataTable, type DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useRecipes} from '../../hooks/queries/useRecipes.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useOwnerFilter} from '../../hooks/useOwnerFilter.ts'
import {t} from '../../i18n'
import {formatKjPerG} from '../../lib/format.ts'
import styles from './RecipesPage.module.css'
import {RecipeView} from './view/RecipeView.tsx'

type KindFilter = RecipeKind | 'all'

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
    {value: 'meal', label: 'Gerichte'},
    {value: 'component', label: 'Komponenten'},
    {value: 'all', label: 'Alle'},
]

/**
 * Rezept-Hub (UI_Spec §3.2): Filter/Suche, Data-Grid und Detail als
 * Overlay-Drawer — ein Klick inspiziert, ohne die Liste zu verlassen.
 */
export default function RecipesPage() {
    const navigate = useNavigate()
    const [kind, setKind] = useState<KindFilter>('meal')
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search)
    const {data: user} = useCurrentUser()
    const userGroups = user?.groups ?? []
    const {ownerFilter, setOwnerFilter, matches} = useOwnerFilter()
    const [drawerRecipe, setDrawerRecipe] = useState<RecipeListItem | null>(null)

    const recipes = useRecipes({
        kind: kind === 'all' ? undefined : kind,
        search: debouncedSearch || undefined,
    })

    const filtered = useMemo(
        () => (recipes.data ?? []).filter(matches),
        [recipes.data, matches],
    )

    const columns: DataTableColumn<RecipeListItem>[] = [
        {key: 'name', label: 'Name', render: (recipe) => recipe.name},
        {
            key: 'kind',
            label: 'Typ',
            render: (recipe) => (
                <span
                    className={`badge ${recipe.kind === 'meal' ? 'badge--success' : 'badge--info'}`}
                >
                    {recipe.kind === 'meal' ? 'Gericht' : 'Komponente'}
                </span>
            ),
        },
        {
            key: 'comment',
            label: 'Kommentar',
            className: `muted ${styles.comment}`,
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

    const emptyMessage =
        recipes.data && recipes.data.length > 0
            ? 'Keine Rezepte für diesen Filter.'
            : 'Keine Rezepte gefunden. Lege das erste über „Neues Rezept“ an.'

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className="section-title">{t('nav.recipes')}</h1>
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void navigate('/recipes/new')}
                >
                    + Neues Rezept
                </button>
            </div>

            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} userGroups={userGroups} ownerFilter={ownerFilter} onChange1={setOwnerFilter} placeholder1="Rezepte durchsuchen…"/>
            // TODO: SegmentedControl is needed in the SearchBar component, but it is currently commented out because of easy migration to other components.
            {/*<div className={styles.controls}>*/}

            {/*    <input*/}
            {/*      className={`input ${styles.search}`}*/}
            {/*      placeholder="Rezepte durchsuchen…"*/}
            {/*      value={search}*/}
            {/*      onChange={(event) => setSearch(event.target.value)}*/}
            {/*    />*/}

            {/*    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>*/}
            {/*        <SegmentedControl*/}
            {/*            options={KIND_OPTIONS}*/}
            {/*            value={kind}*/}
            {/*            onChange={setKind}*/}
            {/*            ariaLabel="Rezeptart filtern"*/}
            {/*        />*/}
            {/*        <GroupFilterSelect*/}
            {/*            groups={userGroups}*/}
            {/*            value={ownerFilter}*/}
            {/*            onChange={setOwnerFilter}*/}
            {/*        />*/}
            {/*    </div>*/}

            {/*</div>*/}

            <DataTable
                columns={columns}
                rows={filtered}
                getRowKey={(recipe) => recipe.id}
                onRowClick={setDrawerRecipe}
                isPending={recipes.isPending}
                isError={recipes.isError}
                error={recipes.error}
                errorNoun="Rezepte"
                emptyMessage={emptyMessage}
                withChevron
            />

            {drawerRecipe && (
                <Drawer
                    title={<DrawerHeader title={drawerRecipe.name} recipeKind={drawerRecipe.kind} owner={drawerRecipe.group_name}/>}
                    onClose={() => setDrawerRecipe(null)}
                >
                    <RecipeView
                        recipeId={drawerRecipe.id}
                        variant="overlay"
                        onDeleted={() => setDrawerRecipe(null)}
                    />
                </Drawer>
            )}
        </div>
    )
}

interface DrawerHeaderProps {
    title: string
    recipeKind?: RecipeKind
    owner?: ReactNode
    comment?: string
    // onClose: () => void
}

function DrawerHeader({title, recipeKind, owner, comment}: DrawerHeaderProps) {
    return (<>
        <h1 className="section-title">{title}</h1>
        <span
          className={`badge ${
            recipeKind === 'meal' ? 'badge--success' : 'badge--info'
          }`}
        >
              {recipeKind === 'meal'
                ? t('recipe.kind.meal')
                : t('recipe.kind.component')}
            </span>
        {owner && <span className="muted">Owner: {owner}</span>}
        {comment && <p className="muted">{comment}</p>}
    </>)
}