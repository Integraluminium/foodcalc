import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Drawer } from '../../components/ui/Drawer'
import { Spinner } from '../../components/ui/Spinner'
import { ExportButton } from '../../components/ui/ExportButton'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  useRecipe,
  useRecipeTree,
  useRecipes,
} from '../../hooks/queries/useRecipes'
import { usePlaces } from '../../hooks/queries/useMasterData'
import { useEventMutations } from '../../hooks/queries/useEvents'
import {
  formatDecimal,
  formatKjPerG,
  localInputToRfc3339,
  rfc3339ToLocalInput,
  toNumber,
} from '../../lib/format'
import { energyDensityKjPerG, scaledWeightKg } from '../../lib/scaling'
import { ENERGY_PRESETS, presetForKj } from '../../lib/plannerPresets'
import { RecipeTreeView } from '../../components/recipes/RecipeTreeView'
import { t } from '../../i18n'
import type { PlannerMeal } from '../../api/types'
import styles from '../EventDetailPage.module.css'

/** Default planning date: tomorrow (pure module helper for lint purity). */
function defaultTomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString()
}

/**
 * Mahlzeiten-Bearbeitung als Seitendrawer (Nutzer-Feedback: Zeilen-Klick
 * löst den Stift ab). Enthält die Konfiguration (Rezept, Portionen,
 * Energie-Ziel, Termin), die Live-Kalkulation und genau EINEN Export-Ort:
 * das skalierte Mahlzeiten-PDF. Basis-PDFs gehören zum Rezept (Rezept-Ansicht),
 * Sammel-Exporte (Zeltkarten, Allergene) in den Exporte-Tab.
 */
export function MealDrawer({
  eventId,
  meal,
  defaultStart,
  onClose,
}: {
  eventId: number
  /** When set, the drawer edits this meal instead of creating a new one. */
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

  const recipe = useRecipe(recipeId ?? 0)
  const tree = useRecipeTree(recipeId ?? 0)
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
    <Drawer
      title={meal ? t('mealDrawer.edit') : t('mealDrawer.plan')}
      onClose={onClose}
    >
      <form id="meal-form" onSubmit={handleSubmit}>
        <div className={styles.drawerForm}>
          <label className="field">
            {t('mealDrawer.recipe')}
            <select
              className="input"
              value={recipeId ?? ''}
              onChange={(event) => setRecipeId(Number(event.target.value) || null)}
              required
            >
              <option value="">{t('mealDrawer.chooseRecipe')}</option>
              {(recipes.data ?? []).map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                  {recipe.kind === 'component'
                    ? t('mealDrawer.componentSuffix')
                    : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label className="field">
              {t('mealDrawer.servings')}
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
                required
              />
            </label>
            <label className="field">
              {t('mealDrawer.energyPerPortion')}
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                value={energyPerServing}
                onChange={(event) => setEnergyPerServing(event.target.value)}
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
                  presetForKj(Number(energyPerServing))?.kj === preset.kj
                    ? 'badge--success'
                    : 'badge--neutral'
                }`}
                onClick={() => setEnergyPerServing(String(preset.kj))}
              >
                {preset.label} · {preset.kj} kJ
              </button>
            ))}
          </div>
          <div className="form-row">
            <label className="field">
              {t('mealDrawer.time')}
              <input
                className="input"
                type="datetime-local"
                value={startLocal}
                onChange={(event) => setStartLocal(event.target.value)}
                required
              />
            </label>
            <label className="field">
              {t('mealDrawer.place')}
              <select
                className="input"
                value={placeId}
                onChange={(event) => setPlaceId(event.target.value)}
                required
              >
                {(places.data ?? []).map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            {t('mealDrawer.comment')}
            <input
              className="input"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t('mealDrawer.optional')}
            />
          </label>
        </div>
      </form>

      {/* Live-Kalkulation */}
      <div className={styles.preview}>
        {recipe.isPending || recipes.isPending ? (
          <div className={styles.previewSkeleton}>
            <Skeleton height="0.8rem" />
            <Skeleton width="60%" height="0.8rem" />
          </div>
        ) : preview !== null &&
          recipeId !== null &&
          Number.isFinite(Number(servings)) &&
          Number.isFinite(Number(energyPerServing)) ? (
          <div className={styles.previewGrid}>
            <span>{t('mealDrawer.servings')}</span>
            <strong>{servings}</strong>
            <span>{t('mealDrawer.energy')}</span>
            <strong>
              {formatDecimal(Number(energyPerServing) * Number(servings), 0)} kJ
            </strong>
            <span>{t('mealDrawer.cookAmount')}</span>
            <strong>{formatDecimal(preview)} kg</strong>
            <span>{t('mealDrawer.density')}</span>
            <strong>
              {formatKjPerG(
                energyDensityKjPerG(
                  recipe.data?.stats?.weight_kg,
                  recipe.data?.stats?.energy_kj,
                ),
              )}
            </strong>
          </div>
        ) : recipeId ? (
          <span className="muted">{t('mealDrawer.noDensity')}</span>
        ) : (
          <span className="muted">{t('mealDrawer.calcHint')}</span>
        )}
      </div>

      {/* Rezept-Überblick (Baum + Kennzahlen) */}
      {recipeId !== null && (
        <section className={`card ${styles.dayCard}`}>
          <div className={styles.dayHeader}>
            <h3 className="section-subtitle">
              {t('mealDrawer.recipeOverview')}
            </h3>
            {recipe.data && (
              <span
                className={`badge ${
                  recipe.data.weighed_in ? 'badge--success' : 'badge--warning'
                }`}
                title={
                  recipe.data.weighed_in
                    ? t('mealDrawer.weighedHint')
                    : t('mealDrawer.notWeighedHint')
                }
              >
                {recipe.data.weighed_in
                  ? t('mealDrawer.weighed')
                  : t('mealDrawer.notWeighed')}
              </span>
            )}
          </div>
          {recipe.data?.stats && (
            <p className="muted">
              {formatDecimal(recipe.data.stats.weight_kg)} kg ·{' '}
              {formatDecimal(recipe.data.stats.energy_kj, 0)} kJ ·{' '}
              {formatKjPerG(recipe.data.stats.energy_kj_per_g)}
            </p>
          )}
          {tree.isPending ? (
            <div className={styles.previewSkeleton}>
              <Skeleton height="0.8rem" />
              <Skeleton width="80%" height="0.8rem" />
              <Skeleton width="65%" height="0.8rem" />
            </div>
          ) : tree.isError ? (
            <p className="muted">
              Baum konnte nicht geladen werden: {String(tree.error)}
            </p>
          ) : tree.data.ingredients.length === 0 &&
            tree.data.children.length === 0 ? (
            <p className="muted">{t('mealDrawer.noIngredients')}</p>
          ) : (
            <RecipeTreeView root={tree.data} />
          )}
        </section>
      )}

      {/* Export dieser Mahlzeit — der EINE Export-Ort im Drawer */}
      {meal && (
        <section className={`card ${styles.dayCard}`}>
          <div className={styles.dayHeader}>
            <h3 className="section-subtitle">{t('mealDrawer.export')}</h3>
            <span className="muted">{t('mealDrawer.exportHint')}</span>
          </div>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${eventId}/exports/meal/${meal.meal_id}`}
            filename={`${meal.name}.pdf`}
            title={t('mealDrawer.exportMealPdfHint')}
          >
            {t('mealDrawer.exportMealPdf')}
          </ExportButton>
        </section>
      )}

      <div className={styles.actionBar}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t('action.cancel')}
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
            t('action.save')
          ) : (
            t('mealDrawer.plan')
          )}
        </button>
      </div>
    </Drawer>
  )
}
