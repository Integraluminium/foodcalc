import {Copy, File, Trash2} from "lucide-react";
import type {FormEvent} from 'react'
import {useMemo, useState} from 'react'
import type {PlannerMeal} from '../../../../api/types.ts'
import {Drawer} from "../../../../components/patterns/drawer/Drawer.tsx";
import {Skeleton} from '../../../../components/patterns/skeleton/Skeleton.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../../components/ui/button/ExportButton.tsx'
import {SegmentedControl} from "../../../../components/ui/segmented_control/SegmentedControl.tsx";
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {useEventMutations} from '../../../../hooks/queries/useEvents.ts'
import {usePlaces} from '../../../../hooks/queries/useMasterData.ts'
import {useRecipe, useRecipes, useRecipeTree,} from '../../../../hooks/queries/useRecipes.ts'
import {t} from '../../../../i18n'
import {
  formatDecimal,
  formatKjPerG,
  localInputToRfc3339,
  rfc3339ToLocalInput,
  toNumber,
} from '../../../../lib/format.ts'
import {ENERGY_PRESETS} from '../../../../lib/plannerPresets.ts'
import {energyDensityKjPerG, scaledWeightKg} from '../../../../lib/scaling.ts'
import {RecipeTreeView} from "../../../recipe/tree_view/RecipeTreeView.tsx";
import styles from '../EventDetailPage.module.css'

type RecipeKindFilter = 'all' | 'meal' | 'component'

function defaultTomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString()
}

export function MealDialog({
                             eventId,
                             meal,
                             defaultStart,
                             onClose,
                           }: {
  eventId: number
  meal?: PlannerMeal
  defaultStart?: string
  onClose: () => void
}) {
  const recipes = useRecipes()
  const places = usePlaces()
  const mutations = useEventMutations(eventId)

  // TODO: IMPORTANT - No change of recipes possible after initial selection!
  //      To do that, just add another recipe and delete the current one.
  const [recipeSearch, setRecipeSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<RecipeKindFilter>('all')
  const [recipeId, setRecipeId] = useState<number | null>(meal?.recipe_id ?? null)
  const [servings, setServings] = useState(String(meal?.servings ?? 30))
  const [energyPerServing, setEnergyPerServing] = useState(
    String(toNumber(meal?.energy_per_serving) ?? 2400),
  )
  const [startLocal, setStartLocal] = useState(
    rfc3339ToLocalInput(meal?.start_time ?? defaultStart ?? defaultTomorrowIso()),
  )
  const [placeId, setPlaceId] = useState<string>(
    String(meal?.place_id ?? places.data?.[0]?.id ?? ''),
  )
  const [comment, setComment] = useState(meal?.comment ?? '')
  useMemo(() => {
    const query = recipeSearch.trim().toLowerCase()
    return (recipes.data ?? []).filter((r) => {
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false
      if (query && !r.name.toLowerCase().includes(query)) return false
      return true
    })
  }, [recipes.data, recipeSearch, kindFilter]);
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

  const pending = mutations.addMeal.isPending || mutations.updateMeal.isPending

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
      mutations.updateMeal.mutate({mealId: meal.meal_id, ...input}, {onSuccess: onClose})
    } else {
      mutations.addMeal.mutate(input, {onSuccess: onClose})
    }
  }

  return (
    <Drawer
      size="lg"
      title={meal ? t('mealDrawer.edit') + ' : ' + meal.name : t('mealDrawer.plan')}
      onClose={onClose}
      footer={
        <>
          <span style={{flex: 1}}/>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button
            type="submit"
            form="meal-form"
            className="btn btn--primary"
            disabled={!recipeId || pending}
          >
            {pending ? <Spinner size="sm"/> : meal ? t('action.save') : t('mealDrawer.plan')}
          </button>
        </>
      }
    >
      <table className="table table--compact">
        <thead>
        <th>Property</th>
        <th>Value</th>
        </thead>
        <tbody>
        <tr>
          <td>{t('mealDrawer.servings')}</td>
          <td><input
            className="input"
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            required
          /></td>
        </tr>
        <tr>
          <td>{t('mealDrawer.energyPerPortion')}</td>
          <td>
            <SegmentedControl options={ENERGY_PRESETS.map((p) => ({label: p.label, value: p.kj}))}
                              value={energyPerServing} onChange={(value) => setEnergyPerServing(value)}/>

            <input
              className="input"
              type="number"
              min="0"
              step="any"
              disabled={true} // Todo enable only if choosen custom value
              value={energyPerServing}
              onChange={(e) => setEnergyPerServing(e.target.value)}
              required
            />

          </td>
        </tr>
        <tr>
          <td>geplante Vorbereitungszeit <Badge variant="warning" title={"TODO"}>TODO</Badge></td>
          <td>
            <input
              className="input"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
            />
          </td>
        </tr>
        <tr>
          {/*// TODO: use more option to attach or detach the preperation from serving time.*/}
          {/*// Additionally, show the calculated preparation time and adjust the planned preparation time accordingly.*/}
          {/*// As most of the time the serving time is the important one and fixed.*/}

          <td>geplante Ausgabezeit <Badge variant="warning" title={"TODO"}>TODO</Badge></td>
          <td>
            <input
              className="input"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
            />
          </td>
        </tr>
        <tr>
          <td>{t('mealDrawer.place')}</td>
          <td>
            {/*<SearchBar value={recipeSearch} onChange={setRecipeSearch} placeholder={t('mealDrawer.searchPlaceholder')} />*/}
            <select
              className="input"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              required
            >
              {(places.data ?? []).map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select></td>
        </tr>
        <tr>
          <td>{t('mealDrawer.comment')}</td>
          <td><textarea
            className="input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('mealDrawer.optional')}
          /></td>
        </tr>

        <tr>
          <td>Export</td>
          <td>
            <div style={{display: 'flex', flexDirection: 'row', gap: 'var(--space-2)'}}>
              <ExportButton
                className="btn btn--ghost"
                path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}
                filename={`${meal?.name ?? 'meal'}.pdf`}
                title={t('mealDrawer.exportMealPdfHint')}
              >
                <File size={15}/>
                Skaliertes Rezept
              </ExportButton>
              <ExportButton
                className="btn btn--ghost"
                path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}
                filename={`${meal?.name ?? 'meal'}.pdf`}
                title={t('mealDrawer.exportMealPdfHint')}
              >
                <File size={15}/>
                Allergen- und Nährwerttabelle
              </ExportButton>
              <ExportButton
                className="btn btn--ghost"
                path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}
                filename={`${meal?.name ?? 'meal'}.pdf`}
                title={t('mealDrawer.exportMealPdfHint')}
              >
                <File size={15}/>
                Tischkarte
              </ExportButton>
            </div>

          </td>
        </tr>
        <tr>
          <td>Management</td>
          <td>
            <div style={{display: 'flex', flexDirection: 'row', gap: 'var(--space-2)'}}>
              <button type="button" className="btn btn--ghost" onClick={() => onDuplicate(meal)}>
                <Copy size={15}/>
                {t('plan.duplicate')}
              </button>
              <button type="button" className="btn btn--danger" title={t('plan.removeFromPlan')}
                      onClick={() => onRemove(meal)}>
                <Trash2 size={15}/>
                {t('plan.removeFromPlan')}
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>

      <div className={styles.preview}>
        <Badge variant="warning" title={"TODO"}>TODO: Make this section more informative</Badge>
        {/*// TODO: update the stats preview when changing the servings or energy per portion.*/}
        {/*//    && Make this section more visually appealing and informative.*/}
        {recipe.isPending || recipes.isPending ? (
          <div className="form-stack">
            <Skeleton height="0.8rem"/>
            <Skeleton width="60%" height="0.8rem"/>
          </div>
        ) : preview !== null && recipeId !== null ? (
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
        ) : (
          <span className="muted">{t('mealDrawer.calcHint')}</span>
        )}
      </div>

      {/*<CardSection title={"Export"}>*/}
      {/*  <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-2)' }}>*/}
      {/*    <ExportButton*/}
      {/*      className="btn btn--ghost"*/}
      {/*      path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}*/}
      {/*      filename={`${meal?.name ?? 'meal'}.pdf`}*/}
      {/*      title={t('mealDrawer.exportMealPdfHint')}*/}
      {/*    >*/}
      {/*      <File size={15}/>*/}
      {/*      Skaliertes Rezept*/}
      {/*    </ExportButton>*/}
      {/*    <ExportButton*/}
      {/*      className="btn btn--ghost"*/}
      {/*      path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}*/}
      {/*      filename={`${meal?.name ?? 'meal'}.pdf`}*/}
      {/*      title={t('mealDrawer.exportMealPdfHint')}*/}
      {/*    >*/}
      {/*      <File size={15}/>*/}
      {/*      Allergen- und Nährwerttabelle*/}
      {/*    </ExportButton>*/}
      {/*    <ExportButton*/}
      {/*      className="btn btn--ghost"*/}
      {/*      path={`/events/${eventId}/exports/meal/${meal?.meal_id ?? 0}`}*/}
      {/*      filename={`${meal?.name ?? 'meal'}.pdf`}*/}
      {/*      title={t('mealDrawer.exportMealPdfHint')}*/}
      {/*    >*/}
      {/*      <File size={15}/>*/}
      {/*      Tischkarte*/}
      {/*    </ExportButton>*/}
      {/*  </div>*/}
      {/*</CardSection>*/}

      {recipeId !== null && tree.data && (
        <div className={styles.preview}>
          <p>{t('mealDrawer.recipeOverview')}
            {recipe.data && (
              <Badge variant={recipe.data.weighed_in ? 'success' : 'warning'}>
                {recipe.data.weighed_in
                  ? t('mealDrawer.weighed')
                  : t('mealDrawer.notWeighed')}
              </Badge>
            )}
          </p>
          {tree.data.ingredients.length === 0 && tree.data.children.length === 0 ? (
            <p className="muted">{t('mealDrawer.noIngredients')}</p>
          ) : (
            <RecipeTreeView root={tree.data}/>
          )}
        </div>
      )}
    </Drawer>
  )
}