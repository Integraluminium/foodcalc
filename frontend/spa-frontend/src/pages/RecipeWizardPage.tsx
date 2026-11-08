import { useEffect, useMemo, useReducer, useState } from 'react'
import type { Dispatch, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, ingredientsApi, recipesApi } from '../api'
import { Spinner } from '../components/ui/Spinner'
import {
  useIngredients,
} from '../hooks/queries/useIngredients'
import {
  useRecipe,
  useRecipes,
} from '../hooks/queries/useRecipes'
import { useGroups, useUnits } from '../hooks/queries/useMasterData'
import { useCurrentUser } from '../hooks/useAuth'
import { useActiveGroup } from '../hooks/useActiveGroup'
import { formatDecimal, toNumber } from '../lib/format'
import type { Ingredient, RecipeDetail } from '../api/types'
import styles from './RecipeWizardPage.module.css'

type Step = 'basis' | 'parts' | 'steps' | 'review'

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'basis', label: '1 · Basis' },
  { key: 'parts', label: '2 · Zutaten & Komponenten' },
  { key: 'steps', label: '3 · Arbeitsschritte' },
  { key: 'review', label: '4 · Prüfen & Speichern' },
]

interface DraftIngredient {
  /** Server row id when editing an existing ingredient line. */
  existingId?: number
  ingredientId: number
  amount: string
  unitId: number
  /** Resolved base weight in kg (amount × kg/unit) once known. */
  kg: number | null
  /** kJ/g density from the ingredient list. */
  density: number | null
}

interface DraftSubRecipe {
  existingId?: number
  recipeId: number
  /** kg of the sub-recipe used by this one. */
  weight: string
  /** kJ/g density of the sub-recipe, resolved by its row. */
  density: number | null
}

interface DraftStep {
  existingId?: number
  name: string
  description: string
  fixedSeconds: number
  perKgSeconds: number
}

interface Draft {
  name: string
  comment: string
  kind: 'meal' | 'component'
  groupId: number
  weighedIn: boolean
  ingredients: DraftIngredient[]
  subRecipes: DraftSubRecipe[]
  steps: DraftStep[]
}

type Action =
  | { type: 'set-frame'; patch: Partial<Pick<Draft, 'name' | 'comment' | 'kind' | 'groupId' | 'weighedIn'>> }
  | { type: 'add-ingredient'; row: DraftIngredient }
  | { type: 'update-ingredient'; index: number; patch: Partial<DraftIngredient> }
  | { type: 'remove-ingredient'; index: number }
  | { type: 'add-sub'; row: DraftSubRecipe }
  | { type: 'update-sub'; index: number; patch: Partial<DraftSubRecipe> }
  | { type: 'remove-sub'; index: number }
  | { type: 'add-step' }
  | { type: 'update-step'; index: number; patch: Partial<DraftStep> }
  | { type: 'remove-step'; index: number }
  | { type: 'move-step'; index: number; direction: -1 | 1 }
  | { type: 'replace'; draft: Draft }

function reducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'set-frame':
      return { ...state, ...action.patch }
    case 'add-ingredient':
      return { ...state, ingredients: [...state.ingredients, action.row] }
    case 'update-ingredient':
      return {
        ...state,
        ingredients: state.ingredients.map((row, index) =>
          index === action.index ? { ...row, ...action.patch } : row,
        ),
      }
    case 'remove-ingredient':
      return {
        ...state,
        ingredients: state.ingredients.filter((_, index) => index !== action.index),
      }
    case 'add-sub':
      return { ...state, subRecipes: [...state.subRecipes, action.row] }
    case 'update-sub':
      return {
        ...state,
        subRecipes: state.subRecipes.map((row, index) =>
          index === action.index ? { ...row, ...action.patch } : row,
        ),
      }
    case 'remove-sub':
      return {
        ...state,
        subRecipes: state.subRecipes.filter((_, index) => index !== action.index),
      }
    case 'add-step':
      return {
        ...state,
        steps: [
          ...state.steps,
          { name: '', description: '', fixedSeconds: 0, perKgSeconds: 0 },
        ],
      }
    case 'update-step':
      return {
        ...state,
        steps: state.steps.map((step, index) =>
          index === action.index ? { ...step, ...action.patch } : step,
        ),
      }
    case 'remove-step':
      return {
        ...state,
        steps: state.steps.filter((_, index) => index !== action.index),
      }
    case 'move-step': {
      const target = action.index + action.direction
      if (target < 0 || target >= state.steps.length) return state
      const steps = [...state.steps]
      ;[steps[action.index], steps[target]] = [steps[target], steps[action.index]]
      return { ...state, steps }
    }
    case 'replace':
      return action.draft
  }
}

/** Creates an empty draft for the create mode. */
function emptyDraft(groupId: number, kind: 'meal' | 'component'): Draft {
  return {
    name: '',
    comment: '',
    kind,
    groupId,
    weighedIn: false,
    ingredients: [],
    subRecipes: [],
    steps: [],
  }
}

/** Maps an existing recipe detail into the draft (edit mode). */
function draftFromDetail(detail: RecipeDetail): Draft {
  return {
    name: detail.name,
    comment: detail.comment ?? '',
    kind: detail.kind,
    groupId: detail.group_id,
    weighedIn: detail.weighed_in,
    ingredients: detail.ingredients.map((row) => ({
      existingId: row.ingredient_id,
      ingredientId: row.ingredient_id,
      amount: String(toNumber(row.amount) ?? ''),
      unitId: row.unit_id,
      kg: null,
      density: null,
    })),
    subRecipes: detail.sub_recipes.map((row) => ({
      existingId: row.recipe_id,
      recipeId: row.recipe_id,
      weight: String(toNumber(row.weight) ?? ''),
      density: null,
    })),
    steps: detail.steps.map((step) => ({
      existingId: step.id,
      name: step.name,
      description: step.description,
      fixedSeconds: step.fixed_duration_seconds,
      perKgSeconds: step.duration_per_kg_seconds,
    })),
  }
}

export default function RecipeWizardPage() {
  const params = useParams()
  const editId = Number(params.recipeId)
  const isEdit = Number.isFinite(editId) && editId > 0

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groups = useGroups()
  const { data: user } = useCurrentUser()
  const { activeGroupId } = useActiveGroup()
  const existing = useRecipe(isEdit ? editId : 0)

  // Creating a recipe defaults to the sidebar's active group (fallback: the
  // user's first group). Editing never transfers ownership implicitly.
  const defaultGroupId = activeGroupId ?? user?.groups[0]?.id ?? 0
  const [hydrated, setHydrated] = useState(false)
  const [draft, dispatch] = useReducer(
    reducer,
    undefined,
    () => emptyDraft(defaultGroupId, 'meal'),
  )
  const [step, setStep] = useState<Step>('basis')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Hydrate the draft once the existing recipe arrives (edit mode).
  if (isEdit && existing.data && !hydrated) {
    dispatch({ type: 'replace', draft: draftFromDetail(existing.data) })
    setHydrated(true)
  }

  // Live planner stats from the draft (kg known rows only).
  const stats = useMemo(() => {
    let weight = 0
    let energy = 0
    for (const row of draft.ingredients) {
      if (row.kg !== null) {
        weight += row.kg
        if (row.density !== null) energy += row.kg * 1000 * row.density
      }
    }
    for (const row of draft.subRecipes) {
      const kg = toNumber(row.weight)
      if (kg !== null) {
        weight += kg
        if (row.density !== null) energy += kg * 1000 * row.density
      }
    }
    const density = weight > 0 ? energy / (weight * 1000) : null
    return { weight, energy, density }
  }, [draft])

  async function commit(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await recipesApi.update(editId, {
          name: draft.name,
          comment: draft.comment.trim(),
          kind: draft.kind,
          weighed_in: draft.weighedIn,
        })

        // Ingredients: update existing rows, add new, drop removed.
        const kept = new Set<number>()
        for (const row of draft.ingredients) {
          const payload = {
            ingredient_id: row.ingredientId,
            amount: row.amount,
            unit_id: row.unitId,
          }
          if (row.existingId && row.existingId !== row.ingredientId) {
            await recipesApi.removeIngredient(editId, row.existingId)
            await recipesApi.addIngredient(editId, payload)
            kept.add(row.ingredientId)
          } else if (row.existingId) {
            kept.add(row.existingId)
            await recipesApi.updateIngredient(editId, row.ingredientId, payload)
          } else {
            await recipesApi.addIngredient(editId, payload)
            kept.add(row.ingredientId)
          }
        }
        for (const row of existing.data?.ingredients ?? []) {
          if (!kept.has(row.ingredient_id)) {
            await recipesApi.removeIngredient(editId, row.ingredient_id)
          }
        }

        // Sub-recipes: same diff pattern, keyed by child recipe id.
        const keptSubs = new Set<number>()
        for (const row of draft.subRecipes) {
          if (row.existingId && row.existingId !== row.recipeId) {
            await recipesApi.removeSubRecipe(editId, row.existingId)
            await recipesApi.addSubRecipe(editId, {
              child_recipe_id: row.recipeId,
              weight: row.weight,
            })
            keptSubs.add(row.recipeId)
          } else if (row.existingId) {
            keptSubs.add(row.recipeId)
            await recipesApi.updateSubRecipe(editId, row.recipeId, {
              weight: row.weight,
            })
          } else {
            await recipesApi.addSubRecipe(editId, {
              child_recipe_id: row.recipeId,
              weight: row.weight,
            })
            keptSubs.add(row.recipeId)
          }
        }
        for (const row of existing.data?.sub_recipes ?? []) {
          if (!keptSubs.has(row.recipe_id)) {
            await recipesApi.removeSubRecipe(editId, row.recipe_id)
          }
        }

        // Steps: diff by step id, renumbering with the draft order.
        const keptSteps = new Set<number>()
        for (const [index, row] of draft.steps.entries()) {
          const payload = {
            order: (index + 1) * 100,
            name: row.name,
            description: row.description,
            fixed_duration_seconds: row.fixedSeconds,
            duration_per_kg_seconds: row.perKgSeconds,
          }
          if (row.existingId) {
            keptSteps.add(row.existingId)
            await recipesApi.updateStep(editId, row.existingId, payload)
          } else {
            await recipesApi.addStep(editId, payload)
          }
        }
        for (const row of existing.data?.steps ?? []) {
          if (!keptSteps.has(row.id)) {
            await recipesApi.removeStep(editId, row.id)
          }
        }

        void queryClient.invalidateQueries({ queryKey: ['recipes'] })
        navigate(`/recipes/${editId}`, { replace: true })
        return
      }

      const created = await recipesApi.create({
        name: draft.name,
        comment: draft.comment.trim() || null,
        kind: draft.kind,
        group_id: draft.groupId,
      })
      for (const row of draft.ingredients) {
        await recipesApi.addIngredient(created.id, {
          ingredient_id: row.ingredientId,
          amount: row.amount,
          unit_id: row.unitId,
        })
      }
      for (const row of draft.subRecipes) {
        await recipesApi.addSubRecipe(created.id, {
          child_recipe_id: row.recipeId,
          weight: row.weight,
        })
      }
      for (const [index, row] of draft.steps.entries()) {
        await recipesApi.addStep(created.id, {
          order: (index + 1) * 100,
          name: row.name,
          description: row.description,
          fixed_duration_seconds: row.fixedSeconds,
          duration_per_kg_seconds: row.perKgSeconds,
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['recipes'] })
      navigate(`/recipes/${created.id}`, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && existing.isPending) {
    return (
      <div className="full-page-center">
        <Spinner size="lg" />
      </div>
    )
  }
  if (isEdit && (existing.isError || !existing.data)) {
    return (
      <p className="secondary">
        Rezept konnte nicht geladen werden: {String(existing.error)}
      </p>
    )
  }

  const stepIndex = STEP_LABELS.findIndex((entry) => entry.key === step)
  const canAdvance = step !== 'basis' || draft.name.trim().length > 0

  return (
    <div className={styles.page}>
      <Link to={isEdit ? `/recipes/${editId}` : '/recipes'} className="secondary">
        ← {isEdit ? 'Zurück zum Rezept' : 'Zurück zur Liste'}
      </Link>

      <h1 className="section-title">
        {isEdit ? `Rezept bearbeiten: ${draft.name || '…'}` : 'Neues Rezept'}
      </h1>

      <div className={styles.stepper}>
        {STEP_LABELS.map((entry, index) => (
          <button
            key={entry.key}
            type="button"
            className={`${styles.stepTab} ${step === entry.key ? styles.stepActive : ''} ${
              index < stepIndex ? styles.stepDone : ''
            }`}
            onClick={() => setStep(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {step === 'basis' && (
            <section className={`card ${styles.card}`}>
              <h2 className="section-subtitle">Basisdaten</h2>
              <label className="field">
                Name
                <input
                  className="input"
                  value={draft.name}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-frame',
                      patch: { name: event.target.value },
                    })
                  }
                  placeholder="z. B. Chili sin Carne"
                  autoFocus
                />
              </label>
              <div className="form-row">
                <label className="field">
                  Typ
                  <select
                    className="input"
                    value={draft.kind}
                    onChange={(event) =>
                      dispatch({
                        type: 'set-frame',
                        patch: { kind: event.target.value as 'meal' | 'component' },
                      })
                    }
                  >
                    <option value="meal">Gericht</option>
                    <option value="component">Komponente</option>
                  </select>
                </label>
                <label className="field">
                  Owner-Gruppe
                  <select
                    className="input"
                    value={draft.groupId}
                    onChange={(event) =>
                      dispatch({
                        type: 'set-frame',
                        patch: { groupId: Number(event.target.value) || 0 },
                      })
                    }
                  >
                    {(groups.data ?? []).map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                Kommentar
                <input
                  className="input"
                  value={draft.comment}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-frame',
                      patch: { comment: event.target.value },
                    })
                  }
                  placeholder="optional"
                />
              </label>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={draft.weighedIn}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-frame',
                      patch: { weighedIn: event.target.checked },
                    })
                  }
                />
                Eingewogen (Mengen grammecht verifiziert)
              </label>
            </section>
          )}

          {step === 'parts' && <PartsStep draft={draft} dispatch={dispatch} />}
          {step === 'steps' && <StepsStep draft={draft} dispatch={dispatch} />}
          {step === 'review' && <ReviewStep draft={draft} stats={stats} />}
        </div>

        <aside className={`card ${styles.sidebar}`}>
          <h2 className="section-subtitle">Kalkulation</h2>
          <div className={styles.statLine}>
            <span className="muted">Gesamtgewicht</span>
            <strong>{formatDecimal(stats.weight)} kg</strong>
          </div>
          <div className={styles.statLine}>
            <span className="muted">Energie gesamt</span>
            <strong>{formatDecimal(stats.energy, 0)} kJ</strong>
          </div>
          <div className={styles.statLine}>
            <span className="muted">Energie-Dichte</span>
            <strong>
              {stats.density !== null
                ? `${formatDecimal(stats.density, 2)} kJ/g`
                : '–'}
            </strong>
          </div>
          <p className="muted">
            Die Dichte skaliert später die Kochmenge: Portionen × kJ-Ziel pro
            Portion.
          </p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.wizardActions}>
            {stepIndex > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep(STEP_LABELS[stepIndex - 1].key)}
              >
                Zurück
              </button>
            )}
            {stepIndex < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canAdvance}
                onClick={() => setStep(STEP_LABELS[stepIndex + 1].key)}
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                disabled={saving || !draft.name.trim()}
                onClick={() => void commit()}
              >
                {saving ? <Spinner size="sm" /> : 'Speichern'}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ------------------------------------------------------------- parts step

function PartsStep({
  draft,
  dispatch,
}: {
  draft: Draft
  dispatch: Dispatch<Action>
}) {
  const ingredients = useIngredients('')
  const units = useUnits()
  const recipes = useRecipes()

  const addIngredient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const ingredientId = Number(data.get('ingredient_id') ?? 0)
    if (!ingredientId) return
    dispatch({
      type: 'add-ingredient',
      row: {
        ingredientId,
        amount: String(data.get('amount') ?? '1'),
        unitId: Number(data.get('unit_id') ?? units.data?.[0]?.id ?? 0),
        kg: null,
        density: null,
      },
    })
  }

  const addSub = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const recipeId = Number(data.get('recipe_id') ?? 0)
    if (!recipeId) return
    dispatch({
      type: 'add-sub',
      row: {
        recipeId,
        weight: String(data.get('weight') ?? '1'),
        density: null,
      },
    })
  }

  return (
    <>
      <section className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Zutaten</h2>
        {draft.ingredients.length === 0 && (
          <p className="muted">Noch keine Zutaten — unten hinzufügen.</p>
        )}
        {draft.ingredients.map((row, index) => (
          <IngredientDraftRow
            key={`${row.ingredientId}-${index}`}
            row={row}
            index={index}
            dispatch={dispatch}
            catalog={ingredients.data ?? []}
            units={units.data ?? []}
          />
        ))}
        <form className={styles.addRow} onSubmit={addIngredient}>
          <select className="input" name="ingredient_id" required>
            <option value="">Zutat wählen…</option>
            {(ingredients.data ?? []).map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
          <input
            className={`input ${styles.narrow}`}
            name="amount"
            type="number"
            min="0"
            step="any"
            defaultValue="1"
            required
          />
          <select className={`input ${styles.narrow}`} name="unit_id" required>
            {(units.data ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--ghost">
            + Zutat
          </button>
        </form>
      </section>

      <section className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Sub-Komponenten</h2>
        <p className="muted">
          Gerichte und Komponenten sind frei kombinierbar (z. B. Komponente als
          Beilage, Mahlzeit als Beilage einer Mahlzeit).
        </p>
        {draft.subRecipes.map((row, index) => (
          <SubDraftRow
            key={`${row.recipeId}-${index}`}
            row={row}
            index={index}
            dispatch={dispatch}
          />
        ))}
        <form className={styles.addRow} onSubmit={addSub}>
          <select className="input" name="recipe_id" required>
            <option value="">Rezept wählen…</option>
            {(recipes.data ?? []).map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
                {recipe.kind === 'component' ? ' (Komponente)' : ''}
              </option>
            ))}
          </select>
          <input
            className={`input ${styles.narrow}`}
            name="weight"
            type="number"
            min="0"
            step="any"
            defaultValue="1"
            required
          />
          <span className={styles.unitLabel}>kg</span>
          <button type="submit" className="btn btn--ghost">
            + Komponente
          </button>
        </form>
      </section>
    </>
  )
}

/** One ingredient draft row; resolves its kg from the ingredient detail. */
function IngredientDraftRow({
  row,
  index,
  dispatch,
  catalog,
  units,
}: {
  row: DraftIngredient
  index: number
  dispatch: Dispatch<Action>
  catalog: Ingredient[]
  units: { id: number; name: string }[]
}) {
  const detail = useQuery({
    queryKey: ['ingredients', 'detail', row.ingredientId] as const,
    queryFn: () => ingredientsApi.detail(row.ingredientId),
    enabled: row.ingredientId > 0,
  })

  useEffect(() => {
    const weights = detail.data?.weights ?? []
    const match = weights.find((weight) => weight.unit_id === row.unitId)
    const amount = toNumber(row.amount)
    const kg = match && amount !== null ? amount * (toNumber(match.weight) ?? 0) : null
    const energy = catalog.find(
      (ingredient) => ingredient.id === row.ingredientId,
    )
    const density = energy ? toNumber(energy.energy) : null
    if (kg !== row.kg || density !== row.density) {
      dispatch({ type: 'update-ingredient', index, patch: { kg, density } })
    }
  }, [
    detail.data,
    row.ingredientId,
    row.unitId,
    row.amount,
    row.kg,
    row.density,
    index,
    dispatch,
    catalog,
  ])

  const name =
    catalog.find((ingredient) => ingredient.id === row.ingredientId)?.name ??
    `Zutat #${row.ingredientId}`

  return (
    <div className={styles.editRow}>
      <span className={styles.rowName}>{name}</span>
      <input
        className={`input ${styles.narrow}`}
        type="number"
        min="0"
        step="any"
        value={row.amount}
        onChange={(event) =>
          dispatch({
            type: 'update-ingredient',
            index,
            patch: { amount: event.target.value },
          })
        }
      />
      <select
        className={`input ${styles.narrow}`}
        value={row.unitId}
        onChange={(event) =>
          dispatch({
            type: 'update-ingredient',
            index,
            patch: { unitId: Number(event.target.value) || 0 },
          })
        }
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
      <span className={styles.kg}>
        {row.kg !== null ? `${formatDecimal(row.kg)} kg` : 'keine Umrechnung'}
      </span>
      <button
        type="button"
        className={styles.iconButton}
        title="Zeile entfernen"
        onClick={() => dispatch({ type: 'remove-ingredient', index })}
      >
        ✕
      </button>
    </div>
  )
}

/** One sub-recipe draft row; resolves the sub-recipe's energy density. */
function SubDraftRow({
  row,
  index,
  dispatch,
}: {
  row: DraftSubRecipe
  index: number
  dispatch: Dispatch<Action>
}) {
  const recipe = useRecipe(row.recipeId)
  useEffect(() => {
    const density = recipe.data?.stats?.energy_kj_per_g ?? null
    if (density !== row.density) {
      dispatch({ type: 'update-sub', index, patch: { density } })
    }
  }, [recipe.data, row.density, index, dispatch])

  return (
    <div className={styles.editRow}>
      <Link to={`/recipes/${row.recipeId}`} className={styles.rowName}>
        {recipe.data?.name ?? `Rezept #${row.recipeId}`}
      </Link>
      <input
        className={`input ${styles.narrow}`}
        type="number"
        min="0"
        step="any"
        value={row.weight}
        onChange={(event) =>
          dispatch({
            type: 'update-sub',
            index,
            patch: { weight: event.target.value },
          })
        }
      />
      <span className={styles.unitLabel}>kg</span>
      <button
        type="button"
        className={styles.iconButton}
        title="Zeile entfernen"
        onClick={() => dispatch({ type: 'remove-sub', index })}
      >
        ✕
      </button>
    </div>
  )
}

// ------------------------------------------------------------- steps step

function StepsStep({
  draft,
  dispatch,
}: {
  draft: Draft
  dispatch: Dispatch<Action>
}) {
  return (
    <section className={`card ${styles.card}`}>
      <h2 className="section-subtitle">Arbeitsschritte</h2>
      <p className="muted">
        Zeiten: fix (z. B. 10 min anbraten) oder pro kg (z. B. 25 min/kg
        kochen). Für die Zeitplanung im Event.
      </p>
      {draft.steps.length === 0 && (
        <p className="muted">Noch keine Schritte — unten hinzufügen.</p>
      )}
      {draft.steps.map((row, index) => (
        <div key={index} className={styles.stepRow}>
          <div className={styles.stepHeader}>
            <strong>{index + 1}.</strong>
            <input
              className="input"
              placeholder="z. B. Zwiebeln anschwitzen"
              value={row.name}
              onChange={(event) =>
                dispatch({
                  type: 'update-step',
                  index,
                  patch: { name: event.target.value },
                })
              }
            />
            <button
              type="button"
              className={styles.iconButton}
              title="Nach oben"
              disabled={index === 0}
              onClick={() => dispatch({ type: 'move-step', index, direction: -1 })}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title="Nach unten"
              disabled={index === draft.steps.length - 1}
              onClick={() => dispatch({ type: 'move-step', index, direction: 1 })}
            >
              ↓
            </button>
            <button
              type="button"
              className={styles.iconButton}
              title="Schritt entfernen"
              onClick={() => dispatch({ type: 'remove-step', index })}
            >
              ✕
            </button>
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Beschreibung"
            value={row.description}
            onChange={(event) =>
              dispatch({
                type: 'update-step',
                index,
                patch: { description: event.target.value },
              })
            }
          />
          <div className={styles.stepTimes}>
            <label>
              fix (min)
              <input
                className={`input ${styles.narrow}`}
                type="number"
                min="0"
                step="1"
                value={row.fixedSeconds > 0 ? row.fixedSeconds / 60 : ''}
                onChange={(event) =>
                  dispatch({
                    type: 'update-step',
                    index,
                    patch: {
                      fixedSeconds: Math.round(
                        (Number(event.target.value) || 0) * 60,
                      ),
                    },
                  })
                }
              />
            </label>
            <label>
              pro kg (min)
              <input
                className={`input ${styles.narrow}`}
                type="number"
                min="0"
                step="1"
                value={row.perKgSeconds > 0 ? row.perKgSeconds / 60 : ''}
                onChange={(event) =>
                  dispatch({
                    type: 'update-step',
                    index,
                    patch: {
                      perKgSeconds: Math.round(
                        (Number(event.target.value) || 0) * 60,
                      ),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => dispatch({ type: 'add-step' })}
      >
        + Schritt
      </button>
    </section>
  )
}

// ------------------------------------------------------------ review step

function ReviewStep({ draft, stats }: { draft: Draft; stats: { weight: number; energy: number; density: number | null } }) {
  return (
    <section className={`card ${styles.card}`}>
      <h2 className="section-subtitle">Prüfen</h2>
      <dl className={styles.reviewGrid}>
        <dt>Name</dt>
        <dd>{draft.name || <em className="muted">fehlt</em>}</dd>
        <dt>Typ</dt>
        <dd>{draft.kind === 'meal' ? 'Gericht' : 'Komponente'}</dd>
        <dt>Eingewogen</dt>
        <dd>{draft.weighedIn ? 'ja' : 'nein'}</dd>
        <dt>Gewicht</dt>
        <dd>{formatDecimal(stats.weight)} kg</dd>
        <dt>Energie</dt>
        <dd>{formatDecimal(stats.energy, 0)} kJ</dd>
        <dt>Dichte</dt>
        <dd>
          {stats.density !== null ? `${formatDecimal(stats.density, 2)} kJ/g` : '–'}
        </dd>
      </dl>
      <p className="muted">
        {draft.ingredients.length} Zutaten · {draft.subRecipes.length}{' '}
        Komponenten · {draft.steps.length} Schritte
      </p>
    </section>
  )
}
