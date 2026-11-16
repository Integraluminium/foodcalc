import {Plus} from 'lucide-react'
import {useMemo, useState} from 'react'
import type {PlannerMeal} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {SkeletonCards} from "../../../../components/patterns/skeleton/Skeleton.tsx";
import {EmptyState, ErrorState} from '../../../../components/patterns/state_views/StateViews.tsx'
import {DataTable, type DataTableColumn} from "../../../../components/patterns/table/DataTable.tsx";
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {useEvent, useEventId, useEventMutations,} from '../../../../hooks/queries/useEvents.ts'
import {t} from '../../../../i18n'
import {formatDayLabel, formatDecimal, formatTime, toNumber,} from '../../../../lib/format.ts'
import {portionCost} from '../../../../lib/scaling.ts'
import styles from '../EventDetailPage.module.css'
import {MealDialog} from "./MealDrawer.tsx";

export function MealPlanTab() {
  const eventId = useEventId()
  const eventData = useEvent(eventId);
  const detail = eventData.data
  const mutations = useEventMutations(eventId)

  // `undefined` = closed, `null` = create new meal, `PlannerMeal` = edit meal
  const [editing, setEditing] = useState<PlannerMeal | null | undefined>(undefined)

  const days = useMemo(() => {
    const groups = new Map<string, PlannerMeal[]>()
    for (const meal of detail?.meals ?? []) {
      const key = new Date(meal.start_time).toDateString()
      const bucket = groups.get(key)
      if (bucket) bucket.push(meal)
      else groups.set(key, [meal])
    }
    return [...groups.entries()]
  }, [detail?.meals])

  if (!detail) return null

  return (
    <section className="tab-section">
      <div className="tab-toolbar">
        <span className="muted">
          {t('plan.summary', {
            meals: detail.meals.length,
            cost: formatDecimal(toNumber(detail.total_cost) ?? 0),
          })}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setEditing(null)}
        >
          <Plus size={16}/> {t('plan.addMeal')}
        </button>
      </div>

      {
        eventData.isPending ? (
          <SkeletonCards count={2}/>
        ) : eventData.isError ? (
            <ErrorState message={t('shopping.toursHeading') + ': ' + eventData.error}/>
          ) :
          days.length === 0 ? (
            <EmptyState message={t('plan.empty')}/>
          ) : (
            <CardSection
              // title={t('plan.heading')}
              // className={styles.mealPlan}
              highlight={false}
            >
              {days.map(([dayKey, meals]) => (
                <DayGroup
                  key={dayKey}
                  label={formatDayLabel(meals[0].start_time)}
                  meals={meals}
                  onEdit={setEditing}
                  onDuplicate={(meal) => mutations.duplicateMeal.mutate(meal.meal_id)}
                  onRemove={(meal) => mutations.removeMeal.mutate(meal.meal_id)}
                />
              ))}

            </CardSection>
          )
      }

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

function formatDish(meal: PlannerMeal) {
  return (
    <>
      {meal.name}
      {!meal.weighed_in && (
        <Badge variant="warning" title={t('plan.notWeighedHint')}>
          ~
        </Badge>
      )}
      {meal.comment && (
        <span className="muted"> · {meal.comment}</span>
      )}
    </>
  )
}

function formatKjPerPortion(meal: PlannerMeal) {
  const energy = toNumber(meal.energy_per_serving)
  if (energy === null) return '–'
  return (
    <>
      {formatDecimal(energy, 0)}
      {meal.energy_kj_per_g !== null && (
        <span className="muted">
                {' '}
          ({formatDecimal(meal.energy_kj_per_g, 2)} kJ/g)
              </span>
      )}
    </>
  )
}

function DayGroup({
                    label,
                    meals,
                    onEdit,
                  }: {
  label: string
  meals: PlannerMeal[]
  onEdit: (meal: PlannerMeal) => void
  onDuplicate: (meal: PlannerMeal) => void
  onRemove: (meal: PlannerMeal) => void
}) {
  const portions = meals.reduce((sum, m) => sum + m.servings, 0)
  const weight = meals.reduce((sum, m) => sum + (toNumber(m.weight) ?? 0), 0)
  const cost = meals.reduce((sum, m) => sum + (toNumber(m.price) ?? 0), 0)

  const columns: DataTableColumn<PlannerMeal>[] = [
    {
      key: 'time',
      label: t('plan.col.time'),
      render: (meal) => formatTime(meal.start_time)
    },
    {
      key: 'dish',
      label: t('plan.col.dish'),
      render: (meal) => formatDish(meal)
    },
    {
      key: 'place',
      label: t('plan.col.place'),
      render: (meal) => meal.place
    },
    {
      key: 'servings',
      label: t('plan.col.servings'),
      align: 'num',
      render: (meal) => meal.servings
    },
    {
      key: 'energy',
      label: t('plan.col.kjPerPortion'),
      align: 'num',
      render: (meal) => formatKjPerPortion(meal)
    },
    {
      key: 'weight',
      label: t('plan.col.weight'),
      align: 'num', render: (meal) => formatDecimal(meal.weight) + ' kg'
    },
    {
      key: 'costPerPortion',
      label: t('plan.col.costPerPortion'),
      align: 'num',
      render: (meal) => {
        const cost = portionCost(meal.price, meal.servings)
        if (cost === null) return '–'
        return formatDecimal(cost) + ' €'
      },
    },
    {
      key: 'cost',
      label: t('plan.col.cost'),
      align: 'num',
      render: (meal) => formatDecimal(meal.price) + ' €'
    },
  ]


  return (
    <>

      <CardSection
        title={label}
        actions={
          <span className={`muted ${styles.dayTotals}`}>
          {t('plan.dayTotals', {
            portions,
            weight: formatDecimal(weight),
            cost: formatDecimal(cost),
          })}
        </span>
        }
        highlight={true}
      >
        <DataTable
          columns={columns}
          rows={meals}
          isPending={false}
          isError={false}
          error={null}
          getRowKey={() => 0}
          onRowClick={(meal) => onEdit(meal)}
          withChevron={true}
          highlight={false}
        />
      </CardSection>
    </>
  )
}