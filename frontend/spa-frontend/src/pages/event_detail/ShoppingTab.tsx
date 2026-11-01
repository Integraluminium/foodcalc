import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../api'
import { Dialog } from '../../components/ui/Dialog'
import { Spinner } from '../../components/ui/Spinner'
import {
  useEventMutations,
  useShoppingList,
} from '../../hooks/queries/useEvents'
import { useStores } from '../../hooks/queries/useMasterData'
import {
  dateInputToRfc3339,
  formatDayLabel,
  formatDecimal,
} from '../../lib/format'
import type { TourWithItems } from '../../api/types'
import styles from '../EventDetailPage.module.css'

/** Today as `YYYY-MM-DD` (pure module helper for lint purity). */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Einkäufe tab: tours with their shopping lists plus uncovered ingredients. */
export function ShoppingTab({ eventId }: { eventId: number }) {
  const shopping = useShoppingList(eventId)
  const mutations = useEventMutations(eventId)
  const stores = useStores()
  const [tourDialogOpen, setTourDialogOpen] = useState(false)
  const [prefillStore, setPrefillStore] = useState<number | null>(null)

  const today = todayIsoDate()

  return (
    <section className={styles.tabSection}>
      <div className={styles.tabToolbar}>
        <span className="muted">
          {shopping.data
            ? `${shopping.data.tours.length} Touren · ${
                shopping.data.without_tour.length
              } Zutaten ohne Tour`
            : 'Einkaufsliste wird geladen…'}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setPrefillStore(null)
            setTourDialogOpen(true)
          }}
        >
          + Tour anlegen
        </button>
      </div>

      {shopping.isPending ? (
        <Spinner />
      ) : shopping.isError ? (
        <p className="secondary">
          Einkaufsliste konnte nicht geladen werden: {String(shopping.error)}
        </p>
      ) : shopping.data.tours.length === 0 &&
        shopping.data.without_tour.length === 0 ? (
        <p className="muted">
          Keine Einkäufe nötig (oder die Rezepte haben keine quellenbezogenen
          Zutaten).
        </p>
      ) : (
        <>
          {shopping.data.tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onRemove={() => mutations.removeTour.mutate(tour.id)}
            />
          ))}
          {shopping.data.without_tour.length > 0 && (
            <div className={`card ${styles.dayCard}`}>
              <div className={styles.dayHeader}>
                <h3 className="section-subtitle">Ohne Tour</h3>
                <span className="muted">
                  Zutaten, deren Händler-Store noch keine Tour im passenden
                  Zeitfenster hat.
                </span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Zutat</th>
                    <th className="num">Menge</th>
                    <th>Store</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shopping.data.without_tour.map((item) => (
                    <tr key={item.ingredient_id}>
                      <td>{item.ingredient_name}</td>
                      <td className="num">{formatDecimal(item.weight)} kg</td>
                      <td className="secondary">{item.store_name}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={item.store_name === 'No Store'}
                          onClick={() => {
                            const store = stores.data?.find(
                              (candidate) => candidate.name === item.store_name,
                            )
                            if (store) {
                              setPrefillStore(store.id)
                              setTourDialogOpen(true)
                            }
                          }}
                        >
                          Tour anlegen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tourDialogOpen && (
        <AddTourDialog
          eventId={eventId}
          prefillStoreId={prefillStore}
          defaultDate={today}
          onClose={() => setTourDialogOpen(false)}
        />
      )}
    </section>
  )
}

function TourCard({
  tour,
  onRemove,
}: {
  tour: TourWithItems
  onRemove: () => void
}) {
  return (
    <div className={`card ${styles.dayCard}`}>
      <div className={styles.dayHeader}>
        <h3 className="section-subtitle">
          {tour.store_name ?? 'Tour'} · {formatDayLabel(tour.tour_date)}
        </h3>
        <div className={styles.rowActions}>
          <span className="muted">
            {tour.items.length} Positionen ·{' '}
            {tour.total_price !== null
              ? `${formatDecimal(tour.total_price)} €`
              : 'keine Preise'}
          </span>
          <button
            type="button"
            className={styles.iconButton}
            title="Liste als Text herunterladen"
            onClick={() =>
              void api.download(
                `/events/${tour.event_id}/exports/tour/${tour.id}`,
                'einkaufsliste.txt',
              )
            }
          >
            ⤓
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title="Tour löschen"
            onClick={onRemove}
          >
            🗑
          </button>
        </div>
      </div>
      {tour.items.length === 0 ? (
        <p className="muted">Keine Zutaten in diesem Zeitfenster.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Zutat</th>
              <th className="num">Menge</th>
              <th className="num">Preis</th>
            </tr>
          </thead>
          <tbody>
            {tour.items.map((item) => (
              <tr key={item.ingredient_id}>
                <td className="secondary">{item.category ?? '–'}</td>
                <td>{item.ingredient_name}</td>
                <td className="num">{formatDecimal(item.weight)} kg</td>
                <td className="num">
                  {item.price === null ? '–' : `${formatDecimal(item.price)} €`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function AddTourDialog({
  eventId,
  prefillStoreId,
  defaultDate,
  onClose,
}: {
  eventId: number
  prefillStoreId: number | null
  defaultDate: string
  onClose: () => void
}) {
  const stores = useStores()
  const mutations = useEventMutations(eventId)
  const [storeId, setStoreId] = useState(
    String(prefillStoreId ?? stores.data?.[0]?.id ?? ''),
  )
  const [date, setDate] = useState(defaultDate)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!storeId) return
    mutations.addTour.mutate(
      { tour_date: dateInputToRfc3339(date), store_id: Number(storeId) },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Einkaufstour anlegen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="tour-form"
            className="btn btn--primary"
            disabled={!storeId || mutations.addTour.isPending}
          >
            {mutations.addTour.isPending ? <Spinner size="sm" /> : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="tour-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Händler / Store
            <select
              className="input"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              required
            >
              {(stores.data ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Datum
            <input
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <p className="muted">
            Zutaten dieses Stores mit passendem „besorgen bis"-Zeitfenster
            landen automatisch auf der Tour.
          </p>
        </div>
      </form>
    </Dialog>
  )
}
