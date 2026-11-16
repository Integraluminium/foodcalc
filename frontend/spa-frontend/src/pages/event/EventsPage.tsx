import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import type {EventListItem} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useEvents} from '../../hooks/queries/useEvents.ts'
import {useGroupName} from '../../hooks/queries/useGroupName.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {formatDateRange, formatDecimal, toNumber} from '../../lib/format.ts'
import styles from './EventsPage.module.css'
import {EventMetadataDrawer} from './workspace/overview/EventMetadataDrawer.tsx'

export default function EventsPage() {
  const { t } = useTranslation([])
  const navigate = useNavigate()
  const events = useEvents()
  const groupName = useGroupName()
  const [createOpen, setCreateOpen] = useState(false)
  const { search, setSearch, ownerFilter, setOwnerFilter, filtered } =
    useFilteredList(events.data, (event) => event.name)

  const columns = useMemo<DataTableColumn<EventListItem>[]>(
    () => [
      {
        key: 'name',
        label:t('common:table.name'),
        render: (event) => (
          <>
            {event.name}
            {event.comment && <span className="muted"> · {event.comment}</span>}
          </>
        ),
      },
      {
        key: 'group',
        label:t('common:table.owner'),
        className: 'secondary',
        render: (event) => groupName(event.group_id),
      },
      {
        key: 'period',
        label:t('events:list.colPeriod'),
        className: 'secondary',
        render: (event) => formatDateRange(event.first_meal, event.last_meal),
      },
      {
        key: 'meals',
        label:t('events:list.colMeals'),
        align: 'num',
        render: (event) => event.meal_count,
      },
      {
        key: 'cost',
        label:t('events:list.colCost'),
        align: 'num',
        render: (event) =>
         t('common:units.currency', {
            value: formatDecimal(toNumber(event.total_cost) ?? 0),
          }),
      },
      {
        key: 'budget',
        label:t('events:list.colBudget'),
        align: 'num',
        render: (event) => {
          const budget = toNumber(event.budget)
          if (budget === null) return '—'
          const cost = toNumber(event.total_cost) ?? 0
          return (
            <span className={cost > budget ? styles.over : undefined}>
              {t('common:units.currency', { value: formatDecimal(budget) })}
            </span>
          )
        },
      },
    ],
    [t, groupName],
  )

  const createLabel =t('events:list.create')

  return (
    <ListPage
      title={t('nav:events')}
      createLabel={createLabel}
      onCreate={() => setCreateOpen(true)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('events:list.searchPlaceholder')}
      ownerFilter={ownerFilter}
      onOwnerFilterChange={setOwnerFilter}
      columns={columns}
      rows={filtered}
      getRowKey={(event) => event.id}
      onRowClick={(event) => void navigate(`/events/${event.id}`)}
      isPending={events.isPending}
      isError={events.isError}
      error={events.error}
      errorNoun={t('events:list.noun')}
      emptyMessage={t('common:list.emptyInitial', {
        noun:t('events:list.noun'),
        createLabel,
      })}
    >
      {createOpen && (
        <EventMetadataDrawer event={null} onClose={() => setCreateOpen(false)} />
      )}
    </ListPage>
  )
}