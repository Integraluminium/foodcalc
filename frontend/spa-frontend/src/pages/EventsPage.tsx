import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { useCreateEvent, useEvents } from '../hooks/queries/useEvents'
import { useCurrentUser } from '../hooks/useAuth'
import { useGroups } from '../hooks/queries/useMasterData'
import { formatDateRange, formatDecimal, toNumber } from '../lib/format'
import styles from './EventsPage.module.css'

export default function EventsPage() {
  const navigate = useNavigate()
  const events = useEvents()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = (events.data ?? []).filter((event) =>
    event.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Events</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          + Neues Event
        </button>
      </div>

      <input
        className={`input ${styles.search}`}
        placeholder="Events durchsuchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

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
                <th>Zeitraum</th>
                <th className="num">Mahlzeiten</th>
                <th className="num">Kosten</th>
                <th className="num">Budget</th>
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
                      {formatDateRange(event.first_meal, event.last_meal)}
                    </td>
                    <td className="num">{event.meal_count}</td>
                    <td className="num">{formatDecimal(cost)} €</td>
                    <td className={`num ${over ? styles.over : ''}`}>
                      {budget === null ? '–' : `${formatDecimal(budget)} €`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && <CreateEventDialog onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

function CreateEventDialog({ onClose }: { onClose: () => void }) {
  const groups = useGroups()
  const { data: user } = useCurrentUser()
  const create = useCreateEvent()
  const defaultGroupId = user?.groups[0]?.id ?? 0

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
