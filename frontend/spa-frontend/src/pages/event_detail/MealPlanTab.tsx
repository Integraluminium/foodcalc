import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useEventMutations } from '../../hooks/queries/useEvents'
import {
  formatDayLabel,
  formatDecimal,
  formatTime,
  toNumber,
} from '../../lib/format'
import type { EventDetail, PlannerMeal } from '../../api/types'
import { MealDialog } from './MealDialog'
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
          {detail.meals.length} Mahlzeiten ·{' '}
          {formatDecimal(toNumber(detail.total_cost) ?? 0)} € eingekauft
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setEditing(null)}
        >
          + Mahlzeit planen
        </button>
      </div>

      {days.length === 0 ? (
        <p className="muted">
          Noch keine Mahlzeiten geplant — oben rechts hinzufügen.
        </p>
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
        <MealDialog
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
          {portions} Portionen · {formatDecimal(weight)} kg ·{' '}
          {formatDecimal(cost)} €
        </span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Gericht</th>
            <th>Ort</th>
            <th className="num">Portionen</th>
            <th className="num">kJ / Portion</th>
            <th className="num">Gewicht</th>
            <th className="num">€ / Portion</th>
            <th className="num">Kosten</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal.meal_id}>
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
                    title="Rezept ist nicht eingewogen — Mengen können abweichen"
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
                {formatDecimal(
                  (toNumber(meal.price) ?? 0) / Math.max(meal.servings, 1),
                )}
              </td>
              <td className="num">{formatDecimal(meal.price)} €</td>
              <td className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Bearbeiten"
                  onClick={() => onEdit(meal)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Duplizieren"
                  onClick={() => onDuplicate(meal)}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Rezept-PDF"
                  onClick={() =>
                    void api.download(
                      `/events/${meal.event_id}/exports/meal/${meal.meal_id}`,
                      `${meal.name}.pdf`,
                    )
                  }
                >
                  ⤓
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Aus dem Plan entfernen"
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
