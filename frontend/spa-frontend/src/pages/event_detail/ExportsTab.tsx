import { useState } from 'react'
import { api } from '../../api'
import { useEventTours } from '../../hooks/queries/useEvents'
import type { PlannerMeal } from '../../api/types'
import styles from '../EventDetailPage.module.css'

/**
 * Exports tab: all generated documents for the event — recipe sheets,
 * allergen list, labels, per-tour shopping lists and per-meal recipe PDFs.
 */
export function ExportsTab({
  eventId,
  eventName,
  meals,
}: {
  eventId: number
  eventName: string
  meals: PlannerMeal[]
}) {
  const tours = useEventTours(eventId)
  const [mealId, setMealId] = useState(0)

  const download = (path: string, filename: string) => {
    void api.download(path, filename)
  }

  return (
    <div className={styles.tabSection}>
      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">Dokumente</h3>
          <span className="muted">
            PDFs mit allen geplanten Mengen; Touren-Listen als Text.
          </span>
        </div>
        <div className={styles.exportGrid}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() =>
              download(
                `/events/${eventId}/exports/recipes`,
                `${eventName}-rezepte.pdf`,
              )
            }
          >
            Rezepte-PDF (alle Mahlzeiten)
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              download(
                `/events/${eventId}/exports/allergens`,
                `${eventName}-allergene.pdf`,
              )
            }
          >
            Allergenliste
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              download(
                `/events/${eventId}/exports/labels`,
                `${eventName}-labels.pdf`,
              )
            }
          >
            Gerichte-Labels (Zeltkarten)
          </button>
        </div>
      </div>

      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">Rezept-PDF einzelner Mahlzeiten</h3>
          <span className="muted">
            Kochanweisung einer einzelnen Mahlzeit (skaliert auf die geplante
            Menge).
          </span>
        </div>
        <div className={styles.exportGrid}>
          <select
            className="input"
            value={mealId || ''}
            onChange={(event) => setMealId(Number(event.target.value) || 0)}
          >
            <option value="">Mahlzeit wählen…</option>
            {meals.map((meal) => (
              <option key={meal.meal_id} value={meal.meal_id}>
                {meal.name} · {meal.servings} Portionen
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!mealId}
            onClick={() =>
              mealId &&
              download(
                `/events/${eventId}/exports/meal/${mealId}`,
                `${eventName}-mahlzeit.pdf`,
              )
            }
          >
            PDF erzeugen
          </button>
        </div>
      </div>

      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">Einkaufslisten</h3>
          <span className="muted">
            Pro Tour eine Liste zum Mitnehmen (Text).
          </span>
        </div>
        {tours.isPending ? (
          <p className="muted">Touren werden geladen…</p>
        ) : (tours.data ?? []).length === 0 ? (
          <p className="muted">Noch keine Touren angelegt.</p>
        ) : (
          <div className={styles.exportGrid}>
            {(tours.data ?? []).map((tour) => (
              <button
                key={tour.id}
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  download(
                    `/events/${eventId}/exports/tour/${tour.id}`,
                    `${eventName}-tour-${tour.id}.txt`,
                  )
                }
              >
                🛒 {tour.store_name ?? `Tour ${tour.id}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
