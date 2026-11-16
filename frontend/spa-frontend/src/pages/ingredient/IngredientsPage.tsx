import {useState} from 'react'
import {GroupFilterSelect} from "../../components/patterns/group_filter/GroupFilterSelect.tsx";
import {SearchBar} from "../../components/patterns/searchbar/SearchBar.tsx";
import {EmptyState, ErrorState, LoadingState} from '../../components/patterns/state_views/StateViews.tsx'
import {useIngredients,} from '../../hooks/queries/useIngredients.ts'
import {useCurrentUser} from "../../hooks/useAuth.ts";
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {useOwnerFilter} from "../../hooks/useOwnerFilter.ts";
import {t} from '../../i18n'
import {formatDecimal} from '../../lib/format.ts'
import {IngredientDataDrawer} from './drawers/IngredientDataDrawer.tsx'
import styles from './IngredientsPage.module.css'
import {IngredientDrawer} from './view/IngredientView.tsx'

/**
 * Zutaten-Hub (UI_Spec §3.2): Suche, Data-Grid und Inspektion als
 * Overlay-Drawer — Bearbeitung passiert in der geteilten `IngredientView`.
 */
export default function IngredientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const ingredients = useIngredients({ search: debouncedSearch || undefined })
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const {data: user} = useCurrentUser()
  const userGroups = user?.groups ?? []
  const {ownerFilter, setOwnerFilter, matches} = useOwnerFilter()


  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">{t('nav.ingredients')}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          + Neue Zutat
        </button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('ingredient.searchPlaceholder')}
      >
         <GroupFilterSelect
          groups={userGroups}
          value={ownerFilter}
          onChange={setOwnerFilter}
        />
      </SearchBar>

      <div className={`card ${styles.panel}`}>
        {ingredients.isPending ? (
          <LoadingState />
        ) : ingredients.isError ? (
          <ErrorState
            message={`Zutaten konnten nicht geladen werden: ${String(ingredients.error)}`}
          />
        ) : ingredients.data.length === 0 ? (
          <EmptyState message="Keine Zutaten gefunden. Lege die erste über „Neue Zutat“ an." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Energie (kJ/g)</th>
                <th>ca. (€/kg)</th>
                <th>Quellen</th>
                <th>Kommentar</th>

              </tr>
            </thead>
            <tbody>
              {ingredients.data.map((ingredient) => (
                <tr
                  key={ingredient.id}
                  className={styles.row}
                  onClick={() => setOpenId(ingredient.id)}
                >
                  <td>{ingredient.name}</td>
                  <td className="num">{formatDecimal(ingredient.energy, 2)}</td>
                  <td className="num">???</td>
                  <td className="num">{ingredient.has_sources ? "✓" : "–"}</td>
                  <td className="secondary">{ingredient.comment || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId !== null && (
        <IngredientDrawer id={openId} onClose={() => setOpenId(null)} />
      )}

      {createOpen && (
        <IngredientDataDrawer ingredient={null} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  )
}

