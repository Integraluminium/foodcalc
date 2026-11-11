import {useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {EmptyState, ErrorState, LoadingState} from '../../components/hub/StateViews.tsx'
import {RecipeView} from '../../components/recipes/RecipeView.tsx'
import {Drawer} from '../../molecules/ui/Drawer.tsx'
import {SegmentedControl} from '../../molecules/ui/SegmentedControl.tsx'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useRecipes} from '../../hooks/queries/useRecipes.ts'
import {useActiveGroup} from '../../hooks/useActiveGroup.ts'
import {t} from '../../i18n'
import {formatKjPerG} from '../../lib/format.ts'
import type {RecipeKind, RecipeListItem} from '../../api/types.ts'
import styles from './RecipesPage.module.css'

type KindFilter = RecipeKind | 'all'
/** Owner-Filter: konkrete Gruppe, `'all'` für alle, `null` = aktive Gruppe. */
type OwnerFilter = number | 'all' | null

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
    const {activeGroupId, groups: userGroups} = useActiveGroup()
    /** `null` = der Sidebar-Gruppe folgen, sonst explizite Wahl. */
    const [ownerOverride, setOwnerOverride] = useState<OwnerFilter>(null)
    const [drawerRecipe, setDrawerRecipe] = useState<RecipeListItem | null>(null)

    const ownerFilter: OwnerFilter = ownerOverride ?? activeGroupId ?? 'all'
    const recipes = useRecipes({
        kind: kind === 'all' ? undefined : kind,
        search: debouncedSearch || undefined,
    })

    const filtered = useMemo(
        () =>
            (recipes.data ?? []).filter(
                (recipe) =>
                    ownerFilter === 'all' || recipe.group_id === ownerFilter,
            ),
        [recipes.data, ownerFilter],
    )

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

            <div className={styles.controls}>
                <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <SegmentedControl
                        options={KIND_OPTIONS}
                        value={kind}
                        onChange={setKind}
                        ariaLabel="Rezeptart filtern"
                    />

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
                {recipes.isPending ? (
                    <LoadingState/>
                ) : recipes.isError ? (
                    <ErrorState
                        message={`Rezepte konnten nicht geladen werden: ${String(recipes.error)}`}
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        message={
                            recipes.data && recipes.data.length > 0
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
                        {filtered.map((recipe) => (
                            <tr
                                key={recipe.id}
                                className={styles.row}
                                onClick={() => setDrawerRecipe(recipe)}
                            >
                                <td>{recipe.name}</td>
                                <td>
                    <span
                        className={`badge ${
                            recipe.kind === 'meal'
                                ? 'badge--success'
                                : 'badge--info'
                        }`}
                    >
                      {recipe.kind === 'meal' ? 'Gericht' : 'Komponente'}
                    </span>
                                </td>
                                <td className={`muted ${styles.comment}`}>
                                    {recipe.comment ?? '–'}
                                </td>
                                <td className="secondary">{recipe.group_name}</td>
                                <td className="num">{formatKjPerG(recipe.energy_kj_per_g)}</td>
                                <td className="num muted">›</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {drawerRecipe && (
                <Drawer
                    title={drawerRecipe.name}
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

