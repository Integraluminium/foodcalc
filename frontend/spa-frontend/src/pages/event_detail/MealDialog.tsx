import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Spinner } from '../../components/ui/Spinner'
import { useRecipe, useRecipes } from '../../hooks/queries/useRecipes'
import { usePlaces } from '../../hooks/queries/useMasterData'
import { useEventMutations } from '../../hooks/queries/useEvents'
import {
  localInputToRfc3339,
  rfc3339ToLocalInput,
  toNumber,
} from '../../lib/format'
import { scaledWeightKg } from '../../lib/scaling'
import { ENERGY_PRESETS, presetForKj } from '../../lib/plannerPresets'
import type { PlannerMeal } from '../../api/types'
import styles from '../EventDetailPage.module.css'

/** Default planning date: tomorrow (pure module helper for lint purity). */
function defaultTomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString()
}

/**
 * Add/edit dialog for a planned meal. The energy-based scaling is visible
 * live: weight = recipe weight × (energy/portion × portions) / recipe energy.
 */
export function MealDialog({
  eventId,
  meal,
  defaultStart,
  onClose,
}: {
  eventId: number
  /** When set, the dialog edits this meal instead of creating a new one. */
  meal?: PlannerMeal
  defaultStart?: string
  onClose: () => void
}) {
  const recipes = useRecipes()
  const places = usePlaces()
  const mutations = useEventMutations(eventId)

  const [recipeId, setRecipeId] = useState<number | null>(
    meal?.recipe_id ?? null,
  )
  const [servings, setServings] = useState(String(meal?.servings ?? 30))
  const [energyPerServing, setEnergyPerServing] = useState(
    String(toNumber(meal?.energy_per_serving) ?? 2400),
  )
  const defaultStartValue =
    meal?.start_time ?? defaultStart ?? defaultTomorrowIso()
  const [startLocal, setStartLocal] = useState(
    rfc3339ToLocalInput(defaultStartValue),
  )
  const [placeId, setPlaceId] = useState<string>(
    String(meal?.place_id ?? places.data?.[0]?.id ?? ''),
  )
  const [comment, setComment] = useState(meal?.comment ?? '')

  // Live scaling preview from the selected recipe's stats — the math lives
  // in lib/scaling.ts (single source of truth).
  const recipe = useRecipe(recipeId ?? 0)
  const preview = useMemo(() => {
    const stats = recipe.data?.stats
    const portions = Number(servings)
    const perServing = Number(energyPerServing)
    if (!stats || !Number.isFinite(portions) || !Number.isFinite(perServing)) {
      return null
    }
    return scaledWeightKg(stats.weight_kg, stats.energy_kj, perServing * portions)
  }, [recipe.data, servings, energyPerServing])

  const pending =
    mutations.addMeal.isPending || mutations.updateMeal.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!recipeId) return
    const input = {
      recipe_id: recipeId,
      place_id: Number(placeId) || undefined,
      start_time: localInputToRfc3339(startLocal),
      energy_per_serving: energyPerServing,
      servings: Number(servings) || 1,
      comment: comment.trim() || null,
    }
    if (meal) {
      mutations.updateMeal.mutate(
        { mealId: meal.meal_id, ...input },
        { onSuccess: onClose },
      )
    } else {
      mutations.addMeal.mutate(input, { onSuccess: onClose })
    }
  }

  return (
    <Dialog
      title={meal ? 'Mahlzeit bearbeiten' : 'Mahlzeit planen'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="meal-form"
            className="btn btn--primary"
            disabled={!recipeId || pending}
          >
            {pending ? (
              <Spinner size="sm" />
            ) : meal ? (
              'Speichern'
            ) : (
              'Planen'
            )}
          </button>
        </>
      }
    >
      <MealFormFields
        recipes={recipes.data ?? []}
        places={places.data ?? []}
        recipeId={recipeId}
        setRecipeId={setRecipeId}
        servings={servings}
        setServings={setServings}
        energyPerServing={energyPerServing}
        setEnergyPerServing={setEnergyPerServing}
        startLocal={startLocal}
        setStartLocal={setStartLocal}
        placeId={placeId}
        setPlaceId={setPlaceId}
        comment={comment}
        setComment={setComment}
        preview={preview}
        recipePending={recipe.isFetching}
        recipeStats={recipe.data?.stats ?? null}
        onSubmit={handleSubmit}
      />
    </Dialog>
  )
}

interface MealFormFieldsProps {
  recipes: { id: number; name: string; kind: 'meal' | 'component' }[]
  places: { id: number; name: string }[]
  recipeId: number | null
  setRecipeId: (value: number | null) => void
  servings: string
  setServings: (value: string) => void
  energyPerServing: string
  setEnergyPerServing: (value: string) => void
  startLocal: string
  setStartLocal: (value: string) => void
  placeId: string
  setPlaceId: (value: string) => void
  comment: string
  setComment: (value: string) => void
  preview: number | null
  recipePending: boolean
  recipeStats: { energy_kj: string; weight_kg: string } | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function MealFormFields(props: MealFormFieldsProps) {
  const totalKj =
    props.recipeStats !== null ? toNumber(props.recipeStats.energy_kj) : null
  const [kindFilter, setKindFilter] = useState<'meal' | 'component' | 'all'>(
    'meal',
  )
  const filteredRecipes = props.recipes.filter(
    (recipe) => kindFilter === 'all' || recipe.kind === kindFilter,
  )
  const activePreset = presetForKj(Number(props.energyPerServing))
  return (
    <form id="meal-form" onSubmit={props.onSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={styles.presetRow}>
          <SegmentedControl
            options={[
              { value: 'meal', label: 'Gerichte' },
              { value: 'component', label: 'Komponenten' },
              { value: 'all', label: 'Alle' },
            ]}
            value={kindFilter}
            onChange={setKindFilter}
            ariaLabel="Rezepttyp filtern"
          />
        </div>
        <label className="field">
          Rezept
          <select
            className="input"
            value={props.recipeId ?? ''}
            onChange={(event) =>
              props.setRecipeId(Number(event.target.value) || null)
            }
            required
          >
            <option value="">Auswählen…</option>
            {filteredRecipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
                {recipe.kind === 'component' ? ' (Komponente)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            Portionen
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              value={props.servings}
              onChange={(event) => props.setServings(event.target.value)}
              required
            />
          </label>
          <label className="field">
            Energie / Portion (kJ)
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={props.energyPerServing}
              onChange={(event) => props.setEnergyPerServing(event.target.value)}
              required
            />
          </label>
        </div>
        <div className={styles.presetRow}>
          {ENERGY_PRESETS.map((preset) => (
            <button
              key={preset.kj}
              type="button"
              title={preset.hint}
              className={`badge ${
                activePreset?.kj === preset.kj
                  ? 'badge--success'
                  : 'badge--neutral'
              }`}
              onClick={() => props.setEnergyPerServing(String(preset.kj))}
            >
              {preset.label} · {preset.kj} kJ
            </button>
          ))}
        </div>
        <div className="form-row">
          <label className="field">
            Zeitpunkt
            <input
              className="input"
              type="datetime-local"
              value={props.startLocal}
              onChange={(event) => props.setStartLocal(event.target.value)}
              required
            />
          </label>
          <label className="field">
            Ort
            <select
              className="input"
              value={props.placeId}
              onChange={(event) => props.setPlaceId(event.target.value)}
              required
            >
              {props.places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Kommentar
          <input
            className="input"
            value={props.comment}
            onChange={(event) => props.setComment(event.target.value)}
            placeholder="optional"
          />
        </label>
        <div className={styles.preview}>
          {props.recipePending ? (
            <span className="muted">Rezept wird geladen…</span>
          ) : props.preview !== null ? (
            <>
              Kalkulierte Kochmenge:{' '}
              <strong>{props.preview.toFixed(2)} kg</strong>
              {totalKj !== null && (
                <span className="muted"> · {totalKj} kJ gesamt</span>
              )}
            </>
          ) : props.recipeId ? (
            <span className="muted">
              Keine Energie-Dichte berechenbar — Zutaten/Energiewerte im Rezept
              prüfen.
            </span>
          ) : (
            <span className="muted">
              Die Kochmenge wird über die Energie-Dichte des Rezepts skaliert.
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
