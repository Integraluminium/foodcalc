import { useMemo, useReducer, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, recipesApi } from '../../../api'
import { Spinner } from '../../../components/ui/spinner/Spinner.tsx'
import {
  useRecipe,

} from '../../../hooks/queries/useRecipes.ts'
import { useGroups, useUnits } from '../../../hooks/queries/useMasterData.ts'
import { useCurrentUser } from '../../../hooks/useAuth.ts'
import { useActiveGroup } from '../../../hooks/useActiveGroup.ts'
import { formatDecimal, toNumber } from '../../../lib/format.ts'
import type { Ingredient, RecipeDetail } from '../../../api/types.ts'
import styles from './RecipeWizardPage.module.css'
import PlaceholderPage from "../../PlaceholderPage.tsx";
import {SegmentedControl} from "../../../components/ui/segented_control/SegmentedControl.tsx";

type Step = 'basis' | 'parts' | 'steps' | 'review'

const STEP_LABELS: { value: Step; label: string }[] = [
  { value: 'basis', label: '1 · Basis' },
  { value: 'parts', label: '2 · Zutaten & Komponenten' },
  { value: 'steps', label: '3 · Arbeitsschritte' },
  { value: 'review', label: '4 · Prüfen & Speichern' },
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
  /** Bereits besuchte Schritte: vorwärts nur über „Weiter", kein Überspringen. */
  const [visited, setVisited] = useState<Step[]>(['basis'])
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

  const stepIndex = STEP_LABELS.findIndex((entry) => entry.value === step)
  const canAdvance = step !== 'basis' || draft.name.trim().length > 0

  const advance = () => {
    const next = STEP_LABELS[stepIndex + 1].value
    setStep(next)
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    )
  }

    const [tab, setTab] = useState<Step>('basis')


    return (
    <div className={styles.page}>
      <Link to={isEdit ? `/recipes/${editId}` : '/recipes'} className="secondary">
        ← {isEdit ? 'Zurück zum Rezept' : 'Zurück zur Liste'}
      </Link>

      <h1 className="section-title">
        {isEdit ? `Rezept bearbeiten: ${draft.name || '…'}` : 'Neues Rezept'}
      </h1>
        
        <SegmentedControl options={[...STEP_LABELS]} value={tab} onChange={setTab} />

      {/*  // TODO: update stepper to allow a more flexible navigation between steps*/}
      {/*<div className={styles.stepper}>*/}
      {/*  {STEP_LABELS.map((entry, index) => (*/}
      {/*    <button*/}
      {/*      key={entry.value}*/}
      {/*      type="button"*/}
      {/*      className={`${styles.stepTab} ${step === entry.value ? styles.stepActive : ''} ${*/}
      {/*        index < stepIndex ? styles.stepDone : ''*/}
      {/*      }`}*/}
      {/*      disabled={!visited.includes(entry.value)}*/}
      {/*      onClick={() => setStep(entry.value)}*/}
      {/*    >*/}
      {/*      {index < stepIndex ? '✓ ' : `${index + 1} · `}*/}
      {/*      {entry.label.replace(/^\d+ · /, '')}*/}
      {/*    </button>*/}
      {/*  ))}*/}
      {/*</div>*/}
        <PlaceholderPage title={"Rezeptbearbeitung"} phase={"-"} />



        // TODO: This bar should be located on the bottom of the page,
        //       but it is currently floating in the middle of the page.
      <div className={styles.actionBar}>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.wizardActions}>
          {stepIndex > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep(STEP_LABELS[stepIndex - 1].value)}
            >
              Zurück
            </button>
          )}
          {stepIndex < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canAdvance}
              title={canAdvance ? undefined : 'Bitte zuerst einen Namen eingeben.'}
              onClick={advance}
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
      </div>
    </div>
  )
}

