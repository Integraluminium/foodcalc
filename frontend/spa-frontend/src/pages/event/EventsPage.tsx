import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import type {EventListItem} from '../../api'
import SearchBar from "../../components/patterns/seachbar/SearchBar.tsx";
import {DataTable, type DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {useEvents} from '../../hooks/queries/useEvents.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {useOwnerFilter} from '../../hooks/useOwnerFilter.ts'
import {t} from '../../i18n'
import {formatDateRange, formatDecimal, toNumber} from '../../lib/format.ts'
import {EventFormDrawer} from './EventFormDrawer.tsx'
import styles from './EventsPage.module.css'

/**
 * Event-Hub (UI_Spec §3.2): Data-Grid mit Budget-Kennzahl, Klick öffnet den
 * Workspace (UI_Spec §3.4); Anlegen über den Formular-Drawer.
 */
export default function EventsPage() {
  const navigate = useNavigate()
  const events = useEvents()
  const {data: groups} = useGroups()
  const {data: user} = useCurrentUser()
  const userGroups = user?.groups ?? []
  const {ownerFilter, setOwnerFilter, matches} = useOwnerFilter()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = (events.data ?? []).filter(
    (event) =>
      matches(event) &&
      event.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const groupName = (groupId: number) =>
    groups?.find((group) => group.id === groupId)?.name ??
    t('overview.groupFallback', {id: groupId})

  const columns: DataTableColumn<EventListItem>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (event) => (
        <>
          {event.name}
          {event.comment && (
            <span className={`muted ${styles.comment}`}>
              {' '}· {event.comment}
            </span>
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
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">{t('nav.events')}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          + Neues Event
        </button>
      </div>

      <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} userGroups={userGroups}
                     ownerFilter={ownerFilter} onChange1={setOwnerFilter} placeholder1={t('event.searchPlaceholder')}/>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(event) => event.id}
        onRowClick={(event) => void navigate(`/events/${event.id}`)}
        isPending={events.isPending}
        isError={events.isError}
        error={events.error}
        errorNoun="Events"
        emptyMessage="Keine Events gefunden. Lege das erste über „Neues Event“ an."
        withChevron
      />

      {createOpen && (
        <EventFormDrawer event={null} onClose={() => setCreateOpen(false)}/>
      )}
    </div>
  )
}
