import { useState } from 'react'
import type { FormEvent } from 'react'
import { Dialog } from '../../../../components/ui/dialog/Dialog.tsx'
import { Spinner } from '../../../../components/ui/spinner/Spinner.tsx'
import { SkeletonCards } from '../../../../components/ui/skeleton/Skeleton.tsx'
import { ExportButton } from '../../../../components/ui/button/ExportButton.tsx'
import { SegmentedControl } from '../../../../components/ui/segented_control/SegmentedControl.tsx'
import {
  useEventMutations,
  useShoppingList,
} from '../../../../hooks/queries/useEvents.ts'
import { useStores } from '../../../../hooks/queries/useMasterData.ts'
import {
  dateInputToRfc3339,
  formatDayLabel,
  formatDecimal,
} from '../../../../lib/format.ts'
import { t } from '../../../../i18n'
import type { IngredientWithoutTour, TourWithItems } from '../../../../api/types.ts'
import { InventorySection } from './InventorySection.tsx'
import { OverridesSection } from './OverridesSection.tsx'
import styles from '../EventDetailPage.module.css'
import {Drawer} from "../../../../components/ui/drawer/Drawer.tsx";

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
            ? t('shopping.summary', {
                tours: shopping.data.tours.length,
                uncovered: shopping.data.without_tour.length,
              })
            : t('shopping.loading')}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setPrefillStore(null)
            setTourDialogOpen(true)
          }}
        >
          {t('shopping.addTour')}
        </button>
      </div>

      {shopping.isPending ? (
        <SkeletonCards count={2} />
      ) : shopping.isError ? (
        <p className="secondary">
          {t('shopping.loadError', { error: String(shopping.error) })}
        </p>
      ) : shopping.data.tours.length === 0 &&
        shopping.data.without_tour.length === 0 ? (
        <p className="muted">{t('shopping.empty')}</p>
      ) : (
        <>
          {shopping.data.tours.length > 0 && (
            <div className={styles.dayHeader}>
              <h3 className="section-subtitle">{t('shopping.toursHeading')}</h3>
              <span className="muted">{t('shopping.toursHint')}</span>
            </div>
          )}
          {shopping.data.tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              uncovered={shopping.data.without_tour}
              onRemove={() => mutations.removeTour.mutate(tour.id)}
            />
          ))}
          {shopping.data.without_tour.length > 0 && (
            <div className={`card ${styles.dayCard}`}>
              <div className={styles.dayHeader}>
                <h3 className="section-subtitle">
                  {t('shopping.withoutTour')}{' '}
                  <span className="badge badge--warning">
                    {t('shopping.statusMissing')}
                  </span>
                </h3>
                <span className="muted">{t('shopping.withoutTourHint')}</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('shopping.col.ingredient')}</th>
                    <th className="num">{t('shopping.col.amount')}</th>
                    <th>{t('shopping.col.store')}</th>
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
                          {t('shopping.addTour').replace('+ ', '')}
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
          uncovered={shopping.data?.without_tour ?? []}
          onClose={() => setTourDialogOpen(false)}
        />
      )}

      <InventorySection eventId={eventId} />
      <OverridesSection eventId={eventId} />
    </section>
  )
}

function TourCard({
  tour,
  uncovered,
  onRemove,
}: {
  tour: TourWithItems
  uncovered: IngredientWithoutTour[]
  onRemove: () => void
}) {
  const mutations = useEventMutations(tour.event_id)
  const [addItem, setAddItem] = useState(0)
  const completed = tour.completed === true

  return (
    <div className={`card ${styles.dayCard}`}>
      <div className={styles.dayHeader}>
        <h3 className="section-subtitle">
          {tour.store_name ?? 'Tour'} · {formatDayLabel(tour.tour_date)}{' '}
          {completed ? (
            <span className="badge badge--success">
              🔒 {t('shopping.completed')}
            </span>
          ) : (
            <span className="badge badge--info">{t('status.planned')}</span>
          )}
        </h3>
        <div className={styles.rowActions}>
          <span className="muted">
            {tour.items.length} {t('calc.col.positions')} ·{' '}
            {tour.total_price !== null
              ? `${formatDecimal(tour.total_price)} €`
              : t('calc.noPrices')}
          </span>
          <ExportButton
            path={`/events/${tour.event_id}/exports/tour/${tour.id}`}
            filename="einkaufsliste.txt"
            title={t('shopping.downloadList')}
            className={styles.iconButton}
          >
            ⤓
          </ExportButton>
          <button
            type="button"
            className={styles.iconButton}
            title={
              completed ? t('shopping.reopen') : t('shopping.markCompleted')
            }
            onClick={() =>
              mutations.setTourCompleted.mutate({
                tourId: tour.id,
                completed: !completed,
              })
            }
          >
            {completed ? '🔓' : '✓'}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('shopping.removeTour')}
            onClick={onRemove}
            disabled={completed}
          >
            🗑
          </button>
        </div>
      </div>
      {tour.items.length === 0 ? (
        <p className="muted">{t('shopping.noItems')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('shopping.col.category')}</th>
              <th>{t('shopping.col.ingredient')}</th>
              <th className="num">{t('shopping.col.amount')}</th>
              <th className="num">{t('shopping.col.price')}</th>
              {!completed && <th />}
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
                {!completed && (
                  <td className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={t('shopping.unassignItem')}
                      onClick={() =>
                        mutations.removeTourItem.mutate({
                          tourId: tour.id,
                          ingredientId: item.ingredient_id,
                        })
                      }
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!completed && (
        <div className={styles.tabToolbar}>
          <select
            className="input"
            value={addItem || ''}
            onChange={(event) => setAddItem(Number(event.target.value) || 0)}
          >
            <option value="">{t('shopping.addItem')}</option>
            {uncovered.map((item) => (
              <option key={item.ingredient_id} value={item.ingredient_id}>
                {item.ingredient_name} ({item.store_name}) ·{' '}
                {formatDecimal(item.weight ?? 0)} kg
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!addItem}
            title={t('shopping.addItemHint')}
            onClick={() => {
              if (!addItem) return
              mutations.addTourItem.mutate({
                tourId: tour.id,
                ingredientId: addItem,
              })
              setAddItem(0)
            }}
          >
            {t('shopping.addItem')}
          </button>
          <span className="muted">{t('shopping.completedHint')}</span>
        </div>
      )}
    </div>
  )
}

function AddTourDialog({
  eventId,
  prefillStoreId,
  defaultDate,
  uncovered,
  onClose,
}: {
  eventId: number
  prefillStoreId: number | null
  defaultDate: string
  /** Zutaten ohne Tour — die Checkbox-Auswahl des Mockups. */
  uncovered: IngredientWithoutTour[]
  onClose: () => void
}) {
  const stores = useStores()
  const mutations = useEventMutations(eventId)
  const [storeId, setStoreId] = useState(
    String(prefillStoreId ?? stores.data?.[0]?.id ?? ''),
  )
  const [date, setDate] = useState(defaultDate)
  /** Mockup „Automatic adding": Welche Zutaten werden vorausgewählt? */
  const [preset, setPreset] = useState<'relevant' | 'none' | 'all'>('relevant')
  const [checked, setChecked] = useState<Set<number>>(() => {
    // Initial: Zutaten, deren Store der vorausgewählten Tour entspricht.
    const initial = new Set<number>()
    const initialStore = prefillStoreId ?? stores.data?.[0]?.id ?? null
    if (initialStore !== null) {
      for (const item of uncovered) {
        const match = stores.data?.find(
          (store) => store.name === item.store_name,
        )
        if (match && match.id === initialStore) initial.add(item.ingredient_id)
      }
    }
    return initial
  })

  const toggle = (ingredientId: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })

  /** Vorauswahl-Modus anwenden (Mockup: Select relevant / None / All). */
  const applyPreset = (mode: 'relevant' | 'none' | 'all') => {
    setPreset(mode)
    if (mode === 'none') {
      setChecked(new Set())
      return
    }
    const selectedStore = Number(storeId) || null
    const next = new Set<number>()
    for (const item of uncovered) {
      if (mode === 'all') next.add(item.ingredient_id)
      else if (selectedStore !== null) {
        const match = stores.data?.find(
          (store) => store.name === item.store_name,
        )
        if (match && match.id === selectedStore) next.add(item.ingredient_id)
      }
    }
    setChecked(next)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!storeId) return
    // Erst die Tour anlegen (der Server ordnet automatisch nach Store +
    // Zeitfenster zu), dann die explizit angehakten Zutaten zusätzlich
    // pinnen — die decken auch den „Privat/Genesis“-Fall ab, bei dem kein
    // Händler-Fit existiert.
    mutations.addTour.mutate(
      { tour_date: dateInputToRfc3339(date), store_id: Number(storeId) },
      {
        onSuccess: (created) => {
          for (const ingredientId of checked) {
            mutations.addTourItem.mutate({
              tourId: created.id,
              ingredientId,
            })
          }
          onClose()
        },
      },
    )
  }

  const busy = mutations.addTour.isPending || mutations.addTourItem.isPending

  return (

    <Drawer
      title={t('shopping.tourForm.title')}
      onClose={onClose}
      // footer={
      //   <>
      //     <button type="button" className="btn btn--ghost" onClick={onClose}>
      //       {t('action.cancel')}
      //     </button>
      //     <button
      //       type="submit"
      //       form="tour-form"
      //       className="btn btn--primary"
      //       disabled={!storeId || busy}
      //     >
      //       {busy ? <Spinner size="sm" /> : t('shopping.tourForm.submit')}
      //     </button>
      //   </>
      // }
    >
      <form id="tour-form" onSubmit={handleSubmit}>
        <div className={styles.drawerForm}>
          <div className="form-row">
            <label className="field">
              {t('shopping.tourForm.store')}
              <select
                className="input"
                value={storeId}
                onChange={(event) => {
                  setStoreId(event.target.value)
                  if (preset === 'relevant') applyPreset('relevant')
                }}
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
              {t('shopping.tourForm.date')}
              <input
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
          </div>
          <p className="muted">{t('shopping.tourForm.hint')}</p>

          {/* Mockup: Automatic adding (Relevant/None/All) + Checkbox-Liste.
              Angehaktes landet garantiert auf dieser Tour — auch Zutaten
              ohne Händler-Fit (Privat-Bestand etc.). */}
          <SegmentedControl
            options={[
              { value: 'relevant', label: t('shopping.preset.relevant') },
              { value: 'none', label: t('shopping.preset.none') },
              { value: 'all', label: t('shopping.preset.all') },
            ]}
            value={preset}
            onChange={applyPreset}
            ariaLabel={t('shopping.preset.aria')}
          />
          {uncovered.length === 0 ? (
            <p className="muted">{t('shopping.preset.noUncovered')}</p>
          ) : (
            <div className={styles.checkList}>
              {uncovered.map((item) => {
                const storeMatch = stores.data?.find(
                  (store) => store.name === item.store_name,
                )
                const relevant =
                  storeMatch !== undefined && storeMatch.id === Number(storeId)
                return (
                  <label
                    key={item.ingredient_id}
                    className={styles.checkItem}
                    title={
                      relevant
                        ? t('shopping.preset.relevantHint')
                        : t('shopping.preset.manualHint')
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(item.ingredient_id)}
                      onChange={() => toggle(item.ingredient_id)}
                    />
                    <span>{item.ingredient_name}</span>
                    <span className="muted">
                      {formatDecimal(item.weight ?? 0)} kg
                    </span>
                    <span
                      className={`badge ${
                        relevant ? 'badge--info' : 'badge--neutral'
                      }`}
                    >
                      {item.store_name}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </Drawer>
  )
}
