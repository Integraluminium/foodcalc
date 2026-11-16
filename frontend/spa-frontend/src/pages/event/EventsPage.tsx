import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import type {EventListItem} from '../../api'
import {ListPage} from '../../components/layout/list_page/ListPage.tsx'
import type {DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useEvents} from '../../hooks/queries/useEvents.ts'
import {useGroupName} from '../../hooks/queries/useGroupName.ts'
import {useFilteredList} from '../../hooks/useFilteredList.ts'
import {t} from '../../i18n'
import {formatDateRange, formatDecimal, toNumber} from '../../lib/format.ts'
import {EventFormDrawer} from './EventFormDrawer.tsx'
import styles from './EventsPage.module.css'

export default function EventsPage() {
  const navigate = useNavigate()
  const events = useEvents()
  const groupName = useGroupName()
  const [createOpen, setCreateOpen] = useState(false)

  const { search, setSearch, ownerFilter, setOwnerFilter, filtered } =
    useFilteredList(events.data, (event) => event.name)

  const columns: DataTableColumn<EventListItem>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (event) => (
        <>
          {event.name}
          {event.comment && (
            <span className="muted"> · {event.comment}</span>
          )}
        </>
      ),
    },
    {
      key: 'group',
      label: 'Gruppe',
      className: 'secondary',
      render: (event) => groupName(event.group_id),
    },
    {
      key: 'period',
      label: 'Zeitraum',
      className: 'secondary',
      render: (event) => formatDateRange(event.first_meal, event.last_meal),
    },
    {
      key: 'meals',
      label: 'Mahlzeiten',
      align: 'num',
      render: (event) => event.meal_count,
    },
    {
      key: 'cost',
      label: 'Kosten',
      align: 'num',
      render: (event) => `${formatDecimal(toNumber(event.total_cost) ?? 0)} €`,
    },
    {
      key: 'budget',
      label: 'Budget',
      align: 'num',
      render: (event) => {
        const budget = toNumber(event.budget)
        if (budget === null) return '–'
        const cost = toNumber(event.total_cost) ?? 0
        return (
          <span className={cost > budget ? styles.over : undefined}>
            {formatDecimal(budget)} €
          </span>
        )
      },
    },
  ]

  return (
    <ListPage
      title={t('nav.events')}
      createLabel="+ Neues Event"
      onCreate={() => setCreateOpen(true)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('event.searchPlaceholder')}
      ownerFilter={ownerFilter}
      onOwnerFilterChange={setOwnerFilter}
      columns={columns}
      rows={filtered}
      getRowKey={(event) => event.id}
      onRowClick={(event) => void navigate(`/events/${event.id}`)}
      isPending={events.isPending}
      isError={events.isError}
      error={events.error}
      errorNoun="Events"
      emptyMessage="Keine Events gefunden. Lege das erste über „Neues Event“ an."
    >
      {createOpen && (
        <EventFormDrawer event={null} onClose={() => setCreateOpen(false)} />
      )}
    </ListPage>
  )
}