import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../components/ui/Dialog'
import { Drawer } from '../components/ui/Drawer'
import { Spinner } from '../components/ui/Spinner'
import { useCreateEvent, useEvents } from '../hooks/queries/useEvents'
import { useGroups } from '../hooks/queries/useMasterData'
import { useActiveGroup } from '../hooks/useActiveGroup'
import { t } from '../i18n'
import { formatDateRange, formatDecimal, toNumber } from '../lib/format'
import type { EventListItem } from '../api/types'
import styles from './EventsPage.module.css'

/** Group filter: a concrete group id, or `'all'` for every group. */
type GroupFilter = number | 'all'

export default function EventsPage() {
  const navigate = useNavigate()
  const events = useEvents()
  const { data: groups } = useGroups()
  const { activeGroupId, groups: userGroups } = useActiveGroup()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerEvent, setDrawerEvent] = useState<EventListItem | null>(null)

  /**
   * Explicit group selection (initially `null` = follow the sidebar's active
   * group). Switching the sidebar group is picked up on the next mount;
   * "Alle Gruppen" and per-group choices persist for this session.
   */
  const [groupOverride, setGroupOverride] = useState<GroupFilter | null>(null)
  const groupFilter: GroupFilter = groupOverride ?? activeGroupId ?? 'all'

  const matchesGroup =
    (event: EventListItem) => groupFilter === 'all' || event.group_id === groupFilter
  const filtered = (events.data ?? []).filter(
    (event) =>
      matchesGroup(event) &&
      event.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

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

      <div className={styles.controls}>
        <input
          className={`input ${styles.search}`}
          placeholder="Events durchsuchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={`input ${styles.filter}`}
          value={groupFilter === 'all' ? 'all' : String(groupFilter)}
          onChange={(event) => {
            const raw = event.target.value
            setGroupOverride(raw === 'all' ? 'all' : Number(raw))
          }}
          aria-label="Nach Gruppe filtern"
        >
          <option value="all">Alle Gruppen</option>
          {userGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
              {group.is_personal ? ' (persönlich)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={`card ${styles.panel}`}>
        {events.isPending ? (
          <div className={styles.empty}>
            <Spinner />
          </div>
        ) : events.isError ? (
          <div className={styles.empty}>
            <p className="secondary">
              Events konnten nicht geladen werden: {String(events.error)}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className="secondary">
              Keine Events gefunden. Lege das erste über „Neues Event" an.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gruppe</th>
                <th>Zeitraum</th>
                <th className="num">Mahlzeiten</th>
                <th className="num">Kosten</th>
                <th className="num">Budget</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const budget = toNumber(event.budget)
                const cost = toNumber(event.total_cost) ?? 0
                const over = budget !== null && cost > budget
                return (
                  <tr
                    key={event.id}
                    className={styles.row}
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <td>
                      {event.name}
                      {event.comment && (
                        <span className={`muted ${styles.comment}`}>
                          {' '}
                          · {event.comment}
                        </span>
                      )}
                    </td>
                    <td className="secondary">
                      {groups?.find((group) => group.id === event.group_id)?.name ??
                        `Gruppe ${event.group_id}`}
                    </td>
                    <td className="secondary">
                      {formatDateRange(event.first_meal, event.last_meal)}
                    </td>
                    <td className="num">{event.meal_count}</td>
                    <td className="num">{formatDecimal(cost)} €</td>
                    <td className={`num ${over ? styles.over : ''}`}>
                      {budget === null ? '–' : `${formatDecimal(budget)} €`}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        title="Details"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          setDrawerEvent(event)
                        }}
                      >
                        ℹ
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {drawerEvent && (
        <ProjectDrawer
          event={drawerEvent}
          groupName={
            groups?.find((group) => group.id === drawerEvent.group_id)?.name ??
            `Gruppe ${drawerEvent.group_id}`
          }
          onClose={() => setDrawerEvent(null)}
          onOpen={() => navigate(`/events/${drawerEvent.id}`)}
        />
      )}

      {createOpen && (
        <CreateEventDialog
          defaultGroupId={activeGroupId ?? 0}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}

/** Quick project summary drawer: status at a glance + link to the cockpit. */
function ProjectDrawer({
  event,
  groupName,
  onClose,
  onOpen,
}: {
  event: EventListItem
  groupName: string
  onClose: () => void
  onOpen: () => void
}) {
  const budget = toNumber(event.budget)
  const cost = toNumber(event.total_cost) ?? 0
  const share =
    budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null
  const over = budget !== null && cost > budget

  return (
    <Drawer title={event.name} onClose={onClose}>
      <p className="muted">{event.comment ?? 'Kein Kommentar'}</p>
      <dl className={styles.summaryGrid}>
        <dt>Owner-Gruppe</dt>
        <dd>{groupName}</dd>
        <dt>Zeitraum</dt>
        <dd>{formatDateRange(event.first_meal, event.last_meal)}</dd>
        <dt>Mahlzeiten</dt>
        <dd>{event.meal_count}</dd>
        <dt>Kosten</dt>
        <dd>{formatDecimal(cost)} €</dd>
        <dt>Budget</dt>
        <dd>
          {budget === null ? (
            '–'
          ) : (
            <>
              {formatDecimal(budget)} €
              <div className={styles.budgetBar}>
                <div
                  className={`${styles.budgetFill} ${over ? styles.budgetOver : ''}`}
                  style={{ width: `${share ?? 0}%` }}
                />
              </div>
            </>
          )}
        </dd>
      </dl>
      <button type="button" className="btn btn--primary" onClick={onOpen}>
        Projekt-Cockpit öffnen
      </button>
    </Drawer>
  )
}

function CreateEventDialog({
  defaultGroupId,
  onClose,
}: {
  defaultGroupId: number
  onClose: () => void
}) {
  const groups = useGroups()
  const create = useCreateEvent()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        comment: String(data.get('comment') ?? '').trim() || null,
        budget: String(data.get('budget') ?? '').trim() || null,
        group_id:
          Number(data.get('group_id') ?? defaultGroupId) || defaultGroupId,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <Dialog
      title="Neues Event"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="create-event-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? <Spinner size="sm" /> : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus />
          </label>
          <div className="form-row">
            <label className="field">
              Budget (€)
              <input
                className="input"
                name="budget"
                type="number"
                step="any"
                min="0"
                placeholder="optional"
              />
            </label>
            <label className="field">
              Owner-Gruppe
              <select
                className="input"
                name="group_id"
                defaultValue={defaultGroupId}
              >
                {(groups.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ' (persönlich)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Kommentar
            <input className="input" name="comment" placeholder="optional" />
          </label>
        </div>
      </form>
    </Dialog>
  )
}
