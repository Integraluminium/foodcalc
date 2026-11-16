import {useQuery} from '@tanstack/react-query'
import {Check, Download, Lock, Pencil, Plus, Trash2, Unlock, X} from 'lucide-react'
import {useMemo, useState} from 'react'
import {ingredientsApi, type IngredientWithoutTour, type TourWithItems,} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Skeleton, SkeletonCards} from '../../../../components/patterns/skeleton/Skeleton.tsx'
import {EmptyState, ErrorState} from '../../../../components/patterns/state_views/StateViews.tsx'
import {DataTable, type DataTableColumn} from '../../../../components/patterns/table/DataTable.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../../components/ui/button/ExportButton.tsx'
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {
  useEvent,
  useEventId,
  useEventInventories,
  useEventMutations,
  useEventOverrides,
  useInventoryCoverage,
  useShoppingList,
} from '../../../../hooks/queries/useEvents.ts'
import {useInventories} from '../../../../hooks/queries/useInventories.ts'
import {useStores} from '../../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../../hooks/usePermissions.ts'
import {t} from '../../../../i18n'
import {formatDayLabel, formatDecimal, toNumber} from '../../../../lib/format.ts'
import styles from '../EventDetailPage.module.css'
import {AddTourDialog} from './AddTourDialog.tsx'

type TourItem = TourWithItems['items'][number]

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ShoppingTab() {
  const eventId = useEventId()
  const shopping = useShoppingList(eventId)
  const mutations = useEventMutations(eventId)
  const detail = useEvent(eventId)
  const editable = usePermissions().canEditGroup(detail.data?.event.group_id ?? 0)

  const [tourDialogOpen, setTourDialogOpen] = useState(false)
  const [prefillStore, setPrefillStore] = useState<number | null>(null)
  const today = todayIsoDate()

  const openTourDialog = (storeId: number | null = null) => {
    setPrefillStore(storeId)
    setTourDialogOpen(true)
  }

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
            onClick={() => openTourDialog(null)}
          >
            <Plus size={16}/> {t('shopping.addTour')}
          </button>
        )}
      </div>

      <CardSection
        highlight={false}
      >

        {shopping.isPending ? (
          <SkeletonCards/>
        ) : shopping.isError ? (
          <ErrorState message={t('shopping.toursHeading') + ': ' + shopping.error}/>
        ) : shopping.data.tours.length === 0 && shopping.data.without_tour.length === 0 ? (
          <EmptyState message={t('shopping.empty')}/>
        ) : (
          <CardSection highlight={true}>
            {shopping.data.tours.map((tour) => (
              <TourGroup
                key={tour.id}
                tour={tour}
                editable={editable}
                onRemove={() => mutations.removeTour.mutate(tour.id)}
                onEdit={() => openTourDialog(tour.store_id)}
              />
            ))}
          </CardSection>
        )}

        {shopping.isPending ? (
          <SkeletonCards/>
        ) : shopping.isError ? (
          <ErrorState message={t('shopping.toursHeading') + ': ' + shopping.error}/>
        ) : shopping.data.tours.length === 0 && shopping.data.without_tour.length === 0 ? (
          <EmptyState message={t('shopping.empty')}/>
        ) : (
          <WithoutTourGroup
            items={shopping.data.without_tour}
            editable={editable}
            onCreateTourForStore={(storeId) => openTourDialog(storeId)}
          />
        )}


        <InventorySection eventId={eventId}/>
        <OverridesSection eventId={eventId}/>
      </CardSection>

      {tourDialogOpen && (
        <AddTourDialog
          eventId={eventId}
          prefillStoreId={prefillStore}
          defaultDate={today}
          uncovered={shopping.data?.without_tour ?? []}
          onClose={() => setTourDialogOpen(false)}
        />
      )}

    </section>
  )
}

function TourGroup({
                     tour,
                     onRemove,
                     editable,
                     onEdit
                   }: {
  tour: TourWithItems,
  onRemove: () => void,
  editable: boolean,
  onEdit?: () => void
}) {
  const mutations = useEventMutations(tour.event_id)
  const completed = tour.completed === true

  const columns: DataTableColumn<TourItem>[] = [
    {
      key: 'ingredient',
      label: t('shopping.col.ingredient'),
      render: (item) => item.ingredient_name,
    },
    {
      key: 'amount',
      label: t('shopping.col.amount'),
      align: 'num',
      render: (item) => `${formatDecimal(item.weight)} kg`,
    },
    {
      key: 'category',
      label: t('shopping.col.category'),
      render: (item) => <span className="secondary">{item.category ?? '–'}</span>,
    },
    {
      key: 'price',
      label: t('shopping.col.price'),
      align: 'num',
      render: (item) => (item.price === null ? '–' : `${formatDecimal(item.price)} €`),
    },
    ...(editable && !completed
      ? [
        {
          key: 'actions',
          label: '',
          align: 'num' as const,
          render: (item: TourItem) => (
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
              <X size={15}/>
            </button>
          ),
        },
      ]
      : []),
  ]

  return (
    <CardSection
      title={`${tour.store_name ?? 'Tour'} · ${formatDayLabel(tour.tour_date)}`}
      highlight={false}
      actions={
        <div className="row-actions">
          {completed ? (
            <Badge variant="success">
              <Lock size={12}/> {t('shopping.completed')}
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
          <>
            <Badge variant="warning">TODO</Badge>
            <ExportButton
              path={`/events/${tour.event_id}/exports/tour/${tour.id}`}
              filename="einkaufsliste.txt"
              title={t('shopping.downloadList')}
              className={styles.iconButton}
            >
              <Download size={15}/>
            </ExportButton>
            {editable && (
              <button
                type="button"
                className={styles.iconButton}
                title={completed ? t('shopping.reopen') : t('shopping.markCompleted')}
                onClick={() =>
                  mutations.setTourCompleted.mutate({
                    tourId: tour.id,
                    completed: !completed,
                  })
                }
              >
                {completed ? <Unlock size={15}/> : <Check size={15}/>}
              </button>
            )}
            {editable && !completed && (
              <>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('shopping.removeTour')}
                  onClick={onRemove}
                >
                  <Trash2 size={15}/>
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t('shopping.editTour')}
                  onClick={() => onEdit && onEdit()}
                >
                  <Pencil size={15}/>
                </button>
              </>
            )}
          </>
        </div>
      }
    >
      {tour.items.length === 0 ? (
        <p className="muted">{t('shopping.noItems')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={tour.items}
          isPending={false}
          isError={false}
          error={null}
          getRowKey={(item) => item.ingredient_id}
          highlight={false}
        />
      )}
    </CardSection>
  )
}

function WithoutTourGroup({
                            items,
                            editable,
                            onCreateTourForStore,
                          }: {
  items: IngredientWithoutTour[]
  editable: boolean
  onCreateTourForStore: (storeId: number) => void
}) {
  const stores = useStores()

  const columns: DataTableColumn<IngredientWithoutTour>[] = [
    {
      key: 'ingredient',
      label: t('shopping.col.ingredient'),
      render: (item) => item.ingredient_name,
    },
    {
      key: 'amount',
      label: t('shopping.col.amount'),
      align: 'num',
      render: (item) => `${formatDecimal(item.weight)} kg`,
    },
    {
      key: 'store',
      label: t('shopping.col.store'),
      render: (item) => <span className="secondary">{item.store_name}</span>,
    },
    ...(editable
      ? [
        {
          key: 'actions',
          label: 'Tour Anlegen',
          align: 'num' as const,
          render: (item: IngredientWithoutTour) => (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={item.store_name === 'No Store'}
              onClick={() => {
                const store = stores.data?.find((c) => c.name === item.store_name)
                if (store) onCreateTourForStore(store.id)
              }}
            >
              <Plus size={14}/> {t('shopping.addTour')}
            </button>
          ),
        },
      ]
      : []),
  ]

  return (
    <CardSection
      title={t('shopping.withoutTour')}
      subtitle={t('shopping.withoutTourHint')}
      highlight={true}
      actions={<Badge variant="warning">{t('shopping.statusMissing')}</Badge>}
    >
      <DataTable
        columns={columns}
        rows={items}
        isPending={false}
        isError={false}
        error={null}
        getRowKey={(item) => item.ingredient_id}
        highlight={false}
      />
    </CardSection>
  )
}

function InventorySection({eventId}: { eventId: number }) {
  const linked = useEventInventories(eventId)
  const all = useInventories()
  const coverage = useInventoryCoverage(eventId)
  const mutations = useEventMutations(eventId)

  const linkedIds = new Set((linked.data ?? []).map((inv) => inv.id))
  const linkable = (all.data ?? []).filter((inv) => !linkedIds.has(inv.id))

  type CoverageRow = NonNullable<typeof coverage.data>[number]

  const columns: DataTableColumn<CoverageRow>[] = [
    {
      key: 'ingredient',
      label: t('eventInventory.col.ingredient'),
      render: (row) => row.ingredient_name,
    },
    {
      key: 'demand',
      label: t('eventInventory.col.demand'),
      align: 'num',
      render: (row) => `${formatDecimal(toNumber(row.demand_kg) ?? 0)} kg`,
    },
    {
      key: 'covered',
      label: t('eventInventory.col.covered'),
      align: 'num',
      render: (row) => {
        const demand = toNumber(row.demand_kg) ?? 0
        const covered = Math.min(toNumber(row.covered_kg) ?? 0, demand)
        return (
          <span className={covered >= demand ? 'muted' : undefined}>
            {formatDecimal(covered)} kg
          </span>
        )
      },
    },
    {
      key: 'missing',
      label: t('eventInventory.col.missing'),
      align: 'num',
      render: (row) => {
        const demand = toNumber(row.demand_kg) ?? 0
        const covered = Math.min(toNumber(row.covered_kg) ?? 0, demand)
        const missing = Math.max(demand - covered, 0)
        return (
          <span className={missing > 0 ? styles.over : 'muted'}>
            {missing > 0 ? `${formatDecimal(missing)} kg` : <Check size={15}/>}
          </span>
        )
      },
    },
  ]

  return (
    <CardSection title={t('eventInventory.heading')} subtitle={t('eventInventory.hint')}>
      <div className="tab-toolbar" style={{marginBottom: 'var(--space-3)'}}>
        <div className="row-actions">
          {(linked.data ?? []).map((inv) => (
            <Badge key={inv.id} variant="info">
              {inv.name}
              <button
                type="button"
                className="icon-btn"
                title={t('eventInventory.unlink')}
                onClick={() => mutations.removeEventInventory.mutate(inv.id)}
              >
                <X size={12}/>
              </button>
            </Badge>
          ))}
          {linked.data?.length === 0 && (
            <span className="muted">{t('eventInventory.noneLinked')}</span>
          )}
        </div>

        <select
          className="input"
          value=""
          onChange={(e) => {
            const inventoryId = Number(e.target.value)
            if (inventoryId) mutations.addEventInventory.mutate(inventoryId)
          }}
        >
          <option value="">{t('eventInventory.link')}</option>
          {linkable.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.name}
            </option>
          ))}
        </select>
      </div>

      {coverage.isPending ? (
        <div className="form-stack">
          <Skeleton height="0.8rem"/>
          <Skeleton width="80%" height="0.8rem"/>
        </div>
      ) : coverage.isError ? (
        <ErrorState message={`${t('eventInventory.heading')}: ${coverage.error}`}/>
      ) : (coverage.data ?? []).length === 0 ? (
        <p className="muted">{t('eventInventory.nothingToCover')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={coverage.data ?? []}
          isPending={false}
          isError={false}
          error={null}
          getRowKey={(row) => row.ingredient_id}
          highlight={false}
        />
      )}
    </CardSection>
  )
}

function OverridesSection({eventId}: { eventId: number }) {
  const shopping = useShoppingList(eventId)
  const overrides = useEventOverrides(eventId)
  const mutations = useEventMutations(eventId)
  const stores = useStores()
  const [ingredientId, setIngredientId] = useState(0)

  const candidates = useMemo(() => {
    const seen = new Map<number, string>()
    if (shopping.data) {
      for (const tour of shopping.data.tours) {
        for (const item of tour.items) seen.set(item.ingredient_id, item.ingredient_name)
      }
      for (const item of shopping.data.without_tour) {
        seen.set(item.ingredient_id, item.ingredient_name)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({id, name}))
  }, [shopping.data])

  const sources = useQuery({
    queryKey: ['ingredients', 'detail', ingredientId] as const,
    queryFn: () => ingredientsApi.detail(ingredientId),
    enabled: ingredientId > 0,
  })

  const overriddenSourceIds = new Set((overrides.data ?? []).map((o) => o.source_id))

  const storeName = (storeId: number) =>
    stores.data?.find((s) => s.id === storeId)?.name ??
    t('overrides.storeFallback', {id: storeId})

  type OverrideRow = NonNullable<typeof overrides.data>[number]

  const columns: DataTableColumn<OverrideRow>[] = [
    {
      key: 'ingredient',
      label: t('overrides.col.ingredient'),
      render: (override) => override.ingredient_name,
    },
    {
      key: 'source',
      label: t('overrides.col.source'),
      render: (override) =>
        override.store_name ?? t('overrides.storeFallback', {id: override.store_id}),
    },
    {
      key: 'actions',
      label: '',
      align: 'num',
      render: (override) => (
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          title={t('overrides.remove')}
          onClick={() => mutations.removeOverride.mutate(override.source_id)}
        >
          <Trash2 size={15}/>
        </button>
      ),
    },
  ]

  return (
    <CardSection title={t('overrides.heading')} subtitle={t('overrides.hint')}>
      <div className="tab-toolbar" style={{marginBottom: 'var(--space-3)'}}>
        <select
          className="input"
          value={ingredientId || ''}
          onChange={(e) => setIngredientId(Number(e.target.value) || 0)}
        >
          <option value="">{t('overrides.chooseIngredient')}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {ingredientId > 0 &&
          (sources.isPending ? (
            <Spinner size="sm"/>
          ) : (
            <select
              className="input"
              value=""
              onChange={(e) => {
                const sourceId = Number(e.target.value)
                if (sourceId) mutations.addOverride.mutate(sourceId)
              }}
            >
              <option value="">{t('overrides.chooseSource')}</option>
              {(sources.data?.sources ?? [])
                .filter((s) => !overriddenSourceIds.has(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {storeName(s.store_id)} ·{' '}
                    {formatDecimal(toNumber(s.package_size) ?? 0)} kg ·{' '}
                    {formatDecimal(toNumber(s.price) ?? 0)} €
                  </option>
                ))}
            </select>
          ))}
      </div>

      {overrides.isPending ? (
        <div className="form-stack">
          <Skeleton height="0.8rem"/>
          <Skeleton width="70%" height="0.8rem"/>
        </div>
      ) : (overrides.data ?? []).length === 0 ? (
        <p className="muted">{t('overrides.none')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={overrides.data ?? []}
          isPending={false}
          isError={false}
          error={null}
          getRowKey={(override) => override.source_id}
          highlight={false}
        />
      )}
    </CardSection>
  )
}