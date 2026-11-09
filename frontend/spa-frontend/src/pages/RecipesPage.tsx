import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Spinner } from '../components/ui/Spinner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useRecipes } from '../hooks/queries/useRecipes'
import { t } from '../i18n'
import { formatKjPerG } from '../lib/format'
import type { RecipeKind } from '../api/types'
import styles from './RecipesPage.module.css'

type KindFilter = RecipeKind | 'all'

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'meal', label: 'Gerichte' },
  { value: 'component', label: 'Komponenten' },
  { value: 'all', label: 'Alle' },
]

export default function RecipesPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<KindFilter>('meal')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const recipes = useRecipes({
    kind: kind === 'all' ? undefined : kind,
    search: debouncedSearch || undefined,
  })

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
        <input
          className={`input ${styles.search}`}
          placeholder="Rezepte durchsuchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SegmentedControl
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          ariaLabel="Rezeptart filtern"
        />
      </div>

      <div className={`card ${styles.panel}`}>
        {recipes.isPending ? (
          <div className={styles.empty}>
            <Spinner />
          </div>
        ) : recipes.isError ? (
          <div className={styles.empty}>
            <p className="secondary">
              Rezepte konnten nicht geladen werden: {String(recipes.error)}
            </p>
          </div>
        ) : recipes.data.length === 0 ? (
          <div className={styles.empty}>
            <p className="secondary">
              Keine Rezepte gefunden. Lege das erste über „Neues Rezept" an.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Typ</th>
                <th>Owner</th>
                <th className="num">Energie</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recipes.data.map((recipe) => (
                <tr
                  key={recipe.id}
                  className={styles.row}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
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
                  <td className="secondary">{recipe.group_name}</td>
                  <td className="num">{formatKjPerG(recipe.energy_kj_per_g)}</td>
                  <td className="num muted">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

