import {Check, Download, Lock, Pencil, Plus, Trash2, Unlock, X,} from 'lucide-react'
import {useState} from 'react'
import type {IngredientWithoutTour, TourWithItems} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {SkeletonCards} from '../../../../components/patterns/skeleton/Skeleton.tsx'
import {EmptyState, ErrorState,} from '../../../../components/patterns/state_views/StateViews.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../../components/ui/button/ExportButton.tsx'
import {useEvent, useEventId, useEventMutations, useShoppingList,} from '../../../../hooks/queries/useEvents.ts'
import {useStores} from '../../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../../hooks/usePermissions.ts'
import {t} from '../../../../i18n'
import {formatDayLabel, formatDecimal,} from '../../../../lib/format.ts'
import styles from '../EventDetailPage.module.css'
import {AddTourDialog} from "./AddTourDialog.tsx";
import {InventorySection} from './InventorySection.tsx'
import {OverridesSection} from './OverridesSection.tsx'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ShoppingTab() {
  const eventId = useEventId()
  const shopping = useShoppingList(eventId)
  const mutations = useEventMutations(eventId)
  const stores = useStores()
  const detail = useEvent(eventId)
  const editable = usePermissions().canEditGroup(detail.data?.event.group_id ?? 0)

  const [tourDialogOpen, setTourDialogOpen] = useState(false)
  const [prefillStore, setPrefillStore] = useState<number | null>(null)
  const today = todayIsoDate()

  return (
    <section className="tab-section">
      <div className="tab-toolbar">
        <span className="muted">
          {shopping.data
            ? t('shopping.summary', {
              tours: shopping.data.tours.length,
              uncovered: shopping.data.without_tour.length,
            })
            : t('shopping.loading')}
        </span>
        {editable && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setPrefillStore(null)
              setTourDialogOpen(true)
            }}
          >
            <Plus size={16} /> {t('shopping.addTour')}
          </button>
        )}
      </div>

      {shopping.isPending ? (
        <SkeletonCards count={2} />
      ) : shopping.isError ? (
        <ErrorState noun={t('shopping.toursHeading') + ': ' + shopping.error} />
      ) : shopping.data.tours.length === 0 &&
      shopping.data.without_tour.length === 0 ? (
        <EmptyState message={t('shopping.empty')} />
      ) : (
        <>
          {shopping.data.tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              uncovered={shopping.data.without_tour}
              editable={editable}
              onRemove={() => mutations.removeTour.mutate(tour.id)}
            />
          ))}

          {shopping.data.without_tour.length > 0 && (
            <CardSection
              title={t('shopping.withoutTour')}
              subtitle={t('shopping.withoutTourHint')}
              actions={
                <Badge variant="warning">{t('shopping.statusMissing')}</Badge>
              }
            >
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
                    <td className="num">
                      {editable && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={item.store_name === 'No Store'}
                          onClick={() => {
                            const store = stores.data?.find(
                              (c) => c.name === item.store_name,
                            )
                            if (store) {
                              setPrefillStore(store.id)
                              setTourDialogOpen(true)
                            }
                          }}
                        >
                          <Plus size={14} /> {t('shopping.addTour')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </CardSection>
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
                    editable,
                  }: {
  tour: TourWithItems
  uncovered: IngredientWithoutTour[]
  onRemove: () => void
  editable: boolean
}) {
  const mutations = useEventMutations(tour.event_id)
  const [addItem, setAddItem] = useState(0)
  const completed = tour.completed === true

  return (
    <CardSection
      title={`${tour.store_name ?? 'Tour'} · ${formatDayLabel(tour.tour_date)}`}
      actions={
        <div className="row-actions">
          {completed ? (
            <Badge variant="success">
              <Lock size={12} /> {t('shopping.completed')}
            </Badge>
          ) : (
            <Badge variant="info">{t('status.planned')}</Badge>
          )}
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
            <Download size={15} />
          </ExportButton>
          {editable && (
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
              {completed ? <Unlock size={15} /> : <Check size={15} />}
            </button>
          )}
          {editable && !completed && (
            <button
              type="button"
              className={styles.iconButton}
              title={t('shopping.removeTour')}
              onClick={onRemove}
            >
              <Trash2 size={15} />
            </button>
          )}
          {editable && !completed && (
            <button
              type="button"
              className={styles.iconButton}
              title={t('shopping.editTour')}
              // onClick={setTourDialogOpen(true)}
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      }
    >
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
            {editable && !completed && <th />}
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
              {editable && !completed && (
                <td className="num">
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
                    <X size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          </tbody>
        </table>
      )}

      {/*{editable && !completed && (*/}
      {/*  <div className="tab-toolbar" style={{ marginTop: 'var(--space-3)' }}>*/}
      {/*    <select*/}
      {/*      className="input"*/}
      {/*      value={addItem || ''}*/}
      {/*      onChange={(e) => setAddItem(Number(e.target.value) || 0)}*/}
      {/*    >*/}
      {/*      <option value="">{t('shopping.addItem')}</option>*/}
      {/*      {uncovered.map((item) => (*/}
      {/*        <option key={item.ingredient_id} value={item.ingredient_id}>*/}
      {/*          {item.ingredient_name} ({item.store_name}) ·{' '}*/}
      {/*          {formatDecimal(item.weight ?? 0)} kg*/}
      {/*        </option>*/}
      {/*      ))}*/}
      {/*    </select>*/}
      {/*    <button*/}
      {/*      type="button"*/}
      {/*      className="btn btn--ghost"*/}
      {/*      disabled={!addItem}*/}
      {/*      title={t('shopping.addItemHint')}*/}
      {/*      onClick={() => {*/}
      {/*        if (!addItem) return*/}
      {/*        mutations.addTourItem.mutate({*/}
      {/*          tourId: tour.id,*/}
      {/*          ingredientId: addItem,*/}
      {/*        })*/}
      {/*        setAddItem(0)*/}
      {/*      }}*/}
      {/*    >*/}
      {/*      <Plus size={14} /> {t('shopping.addItem')}*/}
      {/*    </button>*/}
      {/*  </div>*/}
      {/*)}*/}
    </CardSection>
  )
}

