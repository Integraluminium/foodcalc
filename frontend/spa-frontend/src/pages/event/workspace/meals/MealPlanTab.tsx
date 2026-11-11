import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventMutations } from '../../../../hooks/queries/useEvents.ts'
import {
  formatDayLabel,
  formatDecimal,
  formatTime,
  toNumber,
} from '../../../../lib/format.ts'
import { portionCost } from '../../../../lib/scaling.ts'
import { t } from '../../../../i18n'
import type { EventDetail, PlannerMeal } from '../../../../api/types.ts'
import { MealDrawer } from './MealDrawer.tsx'
import styles from '../EventDetailPage.module.css'

/** Speiseplan tab: meals grouped by day with the planner base values. */
export function MealPlanTab({ detail }: { detail: EventDetail }) {
  const mutations = useEventMutations(detail.event.id)
  /**
   * Dialog state: `undefined` = closed, `null` = create new meal,
   * meal = edit that meal.
   */
  const [editing, setEditing] = useState<PlannerMeal | null | undefined>(
    undefined,
  )

  // Group meals by local calendar day, keeping the API's time order.
  const days = useMemo(() => {
    const groups = new Map<string, PlannerMeal[]>()
    for (const meal of detail.meals) {
      const key = new Date(meal.start_time).toDateString()
      const bucket = groups.get(key)
      if (bucket) bucket.push(meal)
      else groups.set(key, [meal])
    }
    return [...groups.entries()]
  }, [detail.meals])

  return (
    <section className={styles.tabSection}>
      <div className={styles.tabToolbar}>
        <span className="muted">
          {t('plan.summary', {
            meals: detail.meals.length,
            cost: formatDecimal(toNumber(detail.total_cost) ?? 0),
          })}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setEditing(undefined)}
        >
          {t('plan.addMeal')}
        </button>
      </div>

      {days.length === 0 ? (
        <p className="muted">{t('plan.empty')}</p>
      ) : (
        days.map(([dayKey, meals]) => (
          <DayGroup
            key={dayKey}
            label={formatDayLabel(meals[0].start_time)}
            meals={meals}
            onEdit={setEditing}
            onDuplicate={(meal) => mutations.duplicateMeal.mutate(meal.meal_id)}
            onRemove={(meal) => mutations.removeMeal.mutate(meal.meal_id)}
          />
        ))
      )}

      {editing !== undefined && (
        <MealDrawer
          eventId={detail.event.id}
          meal={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </section>
  )
}

function DayGroup({
  label,
  meals,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  label: string
  meals: PlannerMeal[]
  onEdit: (meal: PlannerMeal) => void
  onDuplicate: (meal: PlannerMeal) => void
  onRemove: (meal: PlannerMeal) => void
}) {
  const portions = meals.reduce((sum, meal) => sum + meal.servings, 0)
  const weight = meals.reduce(
    (sum, meal) => sum + (toNumber(meal.weight) ?? 0),
    0,
  )
  const cost = meals.reduce(
    (sum, meal) => sum + (toNumber(meal.price) ?? 0),
    0,
  )

  return (
    <div className={`card ${styles.dayCard}`}>
      <div className={styles.dayHeader}>
        <h3 className="section-subtitle">{label}</h3>
        <span className={`muted ${styles.dayTotals}`}>
          {t('plan.dayTotals', {
            portions,
            weight: formatDecimal(weight),
            cost: formatDecimal(cost),
          })}
        </span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>{t('plan.col.time')}</th>
            <th>{t('plan.col.dish')}</th>
            <th>{t('plan.col.place')}</th>
            <th className="num">{t('plan.col.servings')}</th>
            <th className="num">{t('plan.col.kjPerPortion')}</th>
            <th className="num">{t('plan.col.weight')}</th>
            <th className="num">{t('plan.col.costPerPortion')}</th>
            <th className="num">{t('plan.col.cost')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr
              key={meal.meal_id}
              className={styles.mealRow}
              onClick={() => onEdit(meal)}
            >
              <td className={styles.time}>
                {formatTime(meal.start_time)}
                {meal.end_time !== meal.start_time && (
                  <span className="muted">–{formatTime(meal.end_time)}</span>
                )}
              </td>
              <td>
                <Link to={`/recipes/${meal.recipe_id}`}>{meal.name}</Link>
                {!meal.weighed_in && (
                  <span
                    className={`badge badge--warning ${styles.warnBadge}`}
                    title={t('plan.notWeighedHint')}
                  >
                    ~
                  </span>
                )}
                {meal.comment && (
                  <span className={`muted ${styles.mealComment}`}>
                    {' '}
                    · {meal.comment}
                  </span>
                )}
              </td>
              <td className="secondary">{meal.place}</td>
              <td className="num">{meal.servings}</td>
              <td className="num">
                {formatDecimal(toNumber(meal.energy_per_serving), 0)}
                {meal.energy_kj_per_g !== null && (
                  <span className={`muted ${styles.density}`}>
                    {' '}
                    ({formatDecimal(meal.energy_kj_per_g, 2)} kJ/g)
                  </span>
                )}
              </td>
              <td className="num">{formatDecimal(meal.weight)} kg</td>
              <td className="num">
                {formatDecimal(portionCost(meal.price, meal.servings) ?? 0)}
              </td>
              <td className="num">{formatDecimal(meal.price)} €</td>
              <td className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('plan.duplicate')}
                  onClick={() => onDuplicate(meal)}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('plan.removeFromPlan')}
                  onClick={() => onRemove(meal)}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
