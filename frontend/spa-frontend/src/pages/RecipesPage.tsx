import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Dialog } from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useCreateRecipe, useRecipes } from '../hooks/queries/useRecipes'
import { useCurrentUser } from '../hooks/useAuth'
import { useGroups } from '../hooks/queries/useMasterData'
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
  const { data: user } = useCurrentUser()
  const [kind, setKind] = useState<KindFilter>('meal')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [createOpen, setCreateOpen] = useState(false)

  const recipes = useRecipes({
    kind: kind === 'all' ? undefined : kind,
    search: debouncedSearch || undefined,
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Recipes</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
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

      {createOpen && user && (
        <CreateRecipeDialog
          defaultGroupId={user.groups[0]?.id ?? 0}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false)
            void navigate(`/recipes/${id}`)
          }}
        />
      )}
    </div>
  )
}

function CreateRecipeDialog({
  defaultGroupId,
  onClose,
  onCreated,
}: {
  defaultGroupId: number
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const groups = useGroups()
  const create = useCreateRecipe()
  const [kind, setKind] = useState<RecipeKind>('meal')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        comment: String(data.get('comment') ?? '').trim() || null,
        kind,
        group_id: Number(data.get('group_id') ?? defaultGroupId) || defaultGroupId,
      },
      { onSuccess: (recipe) => onCreated(recipe.id) },
    )
  }

  return (
    <Dialog
      title="Neues Rezept"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="create-recipe-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? <Spinner size="sm" /> : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-recipe-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus />
          </label>
          <label className="field">
            Typ
            <select
              className="input"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as RecipeKind)}
            >
              <option value="meal">Gericht</option>
              <option value="component">Komponente</option>
            </select>
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
          <label className="field">
            Kommentar
            <input className="input" name="comment" placeholder="optional" />
          </label>
        </div>
      </form>
    </Dialog>
  )
}
