import { Spinner } from '../../components/ui/Spinner'
import {
  useEventPreps,
  useEventTours,
} from '../../hooks/queries/useEvents'
import { formatDayLabel, formatDecimal, formatTime, toNumber } from '../../lib/format'
import type { PlannerMeal } from '../../api/types'
import styles from '../EventDetailPage.module.css'

/** RFC 3339 timestamp → `YYYY-MM-DD` calendar day key. */
function dayKey(rfc3339: string): string {
  return rfc3339.slice(0, 10)
}

/**
 * Read-only timeline: one card per calendar day with the three lanes
 * Einkauf (shopping tours), Vorkochen (food prep) and Essen (meals).
 */
export function TimelineTab({ meals }: { meals: PlannerMeal[] }) {
  const preps = useEventPreps(meals[0]?.event_id ?? 0)
  const tours = useEventTours(meals[0]?.event_id ?? 0)

  if (preps.isPending || tours.isPending) {
    return (
      <div className={styles.tabSection}>
        <Spinner />
      </div>
    )
  }
  if (preps.isError || tours.isError) {
    return (
      <div className={styles.tabSection}>
        <p className="secondary">
          Zeitplan konnte nicht geladen werden:{' '}
          {String(preps.isError ? preps.error : tours.error)}
        </p>
      </div>
    )
  }

  const days = new Map<
    string,
    {
      tours: { id: number; label: string }[]
      preps: { id: number; label: string; window: string }[]
      meals: PlannerMeal[]
    }
  >()
  const day = (key: string) => {
    let entry = days.get(key)
    if (!entry) {
      entry = { tours: [], preps: [], meals: [] }
      days.set(key, entry)
    }
    return entry
  }

  for (const tour of tours.data ?? []) {
    day(dayKey(tour.tour_date)).tours.push({
      id: tour.id,
      label: tour.store_name ?? `Tour #${tour.id}`,
    })
  }
  for (const prep of preps.data ?? []) {
    day(dayKey(prep.prep_date)).preps.push({
      id: prep.id,
      label: prep.recipe_name,
      window: prep.use_from
        ? `${formatTime(prep.use_from)} – ${formatTime(prep.use_until)}`
        : formatTime(prep.use_until),
    })
  }
  for (const meal of meals) {
    day(dayKey(meal.start_time)).meals.push(meal)
  }

  const sorted = [...days.entries()].sort(([a], [b]) => a.localeCompare(b))

  if (sorted.length === 0) {
    return (
      <div className={styles.tabSection}>
        <p className="muted">
          Noch keine Termine: Mahlzeiten, Touren oder Vorkochen anlegen.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.tabSection}>
      {sorted.map(([key, entry]) => (
        <div key={key} className={`card ${styles.dayCard}`}>
          <div className={styles.dayHeader}>
            <h3 className="section-subtitle">{formatDayLabel(`${key}T00:00:00Z`)}</h3>
          </div>
          {entry.tours.length > 0 && (
            <div className={styles.timelineLane}>
              <span className={`badge badge--neutral ${styles.laneBadge}`}>
                🛒 Einkauf
              </span>
              {entry.tours.map((tour) => (
                <span key={tour.id} className={styles.laneItem}>
                  {tour.label}
                </span>
              ))}
            </div>
          )}
          {entry.preps.length > 0 && (
            <div className={styles.timelineLane}>
              <span className={`badge badge--warning ${styles.laneBadge}`}>
                🍳 Vorkochen
              </span>
              {entry.preps.map((prep) => (
                <span key={prep.id} className={styles.laneItem}>
                  {prep.label}{' '}
                  <span className="muted">({prep.window})</span>
                </span>
              ))}
            </div>
          )}
          {entry.meals.length > 0 && (
            <div className={styles.timelineLane}>
              <span className={`badge badge--success ${styles.laneBadge}`}>
                🍲 Essen
              </span>
              {entry.meals.map((meal) => (
                <span key={meal.meal_id} className={styles.laneItem}>
                  {formatTime(meal.start_time)} {meal.name}
                  {meal.place ? ` · ${meal.place}` : ''} ·{' '}
                  {meal.servings} Portionen ·{' '}
                  {formatDecimal(toNumber(meal.weight) ?? 0)} kg
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
