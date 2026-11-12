import type {FormEvent} from 'react'
import {useState} from 'react'
import {EmptyState, ErrorState, LoadingState} from '../../components/patterns/state_views/StateViews.tsx'
import {Dialog} from "../../components/patterns/dialog/Dialog.tsx";
import {useCreateIngredient, useIngredients,} from '../../hooks/queries/useIngredients.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {useDebouncedValue} from '../../hooks/useDebouncedValue.ts'
import {t} from '../../i18n'
import {formatDecimal} from '../../lib/format.ts'
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
  const { data: user } = useCurrentUser()
  const personalGroupId =
    user?.groups.find((group) => group.is_personal)?.id ??
    user?.groups[0]?.id ??
    0
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

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

      <input
        className={`input ${styles.search}`}
        placeholder="Zutaten durchsuchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

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
        <CreateIngredientDialog
          defaultGroupId={personalGroupId}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}

function CreateIngredientDialog({
  defaultGroupId,
  onClose,
}: {
  defaultGroupId: number
  onClose: () => void
}) {
  const groups = useGroups()
  const create = useCreateIngredient()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        energy: String(data.get('energy') ?? '').trim(),
        comment: String(data.get('comment') ?? '').trim() || null,
        group_id: Number(data.get('group_id') ?? defaultGroupId) || defaultGroupId,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <Dialog
      title="Neue Zutat"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="create-ingredient-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? 'Anlegen…' : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-ingredient-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus />
          </label>
          <label className="field">
            Energie (kJ/g)
            <input
              className="input"
              name="energy"
              type="number"
              step="any"
              min="0"
              required
              placeholder="z. B. 14.5"
            />
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
