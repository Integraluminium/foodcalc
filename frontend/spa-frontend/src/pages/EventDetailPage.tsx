import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Spinner } from '../components/ui/Spinner'
import { useEvent, useEventMutations } from '../hooks/queries/useEvents'
import { formatDateRange, formatDecimal, toNumber } from '../lib/format'
import type { EventDetail } from '../api/types'
import { EditEventDialog } from './event_detail/EditEventDialog'
import { MealPlanTab } from './event_detail/MealPlanTab'
import { ShoppingTab } from './event_detail/ShoppingTab'
import styles from './EventDetailPage.module.css'

type Tab = 'plan' | 'shopping'

const TAB_OPTIONS = [
  { value: 'plan', label: 'Speiseplan' },
  { value: 'shopping', label: 'Einkäufe' },
] as const

export default function EventDetailPage() {
  const params = useParams()
  const eventId = Number(params.eventId)
  const detail = useEvent(eventId)
  const [tab, setTab] = useState<Tab>('plan')

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return (
      <p className="secondary">
        Ungültige Event-ID. <Link to="/events">Zurück zur Liste</Link>
      </p>
    )
  }
  if (detail.isPending) {
    return (
      <div className="full-page-center">
        <Spinner size="lg" />
      </div>
    )
  }
  if (detail.isError || !detail.data) {
    return (
      <p className="secondary">
        Event konnte nicht geladen werden: {String(detail.error)}
      </p>
    )
  }

  return <EventEditor detail={detail.data} tab={tab} onTabChange={setTab} />
}

function EventEditor({
  detail,
  tab,
  onTabChange,
}: {
  detail: EventDetail
  tab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const navigate = useNavigate()
  const mutations = useEventMutations(detail.event.id)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cost = toNumber(detail.total_cost) ?? 0
  const budget = toNumber(detail.event.budget)
  const share =
    budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null
  const over = budget !== null && cost > budget

  return (
    <div className={styles.page}>
      <Link to="/events" className="secondary">
        ← Events
      </Link>

      <div className={`card ${styles.header}`}>
        <div className={styles.headerMain}>
          <h1 className="section-title">{detail.event.name}</h1>
          <div className={styles.badges}>
            <span className="badge badge--neutral">
              {formatDateRange(
                detail.meals[0]?.start_time ?? null,
                detail.meals[detail.meals.length - 1]?.start_time ?? null,
              )}
            </span>
            <span className="badge badge--info">
              {detail.meals.length} Mahlzeiten
            </span>
            {detail.event.comment && (
              <span className="muted">{detail.event.comment}</span>
            )}
          </div>
          <div className={styles.budgetRow}>
            <span className={over ? styles.over : ''}>
              {formatDecimal(cost)} €
              {budget !== null && ` / ${formatDecimal(budget)} €`}
            </span>
            {share !== null && (
              <div className={styles.budgetBar}>
                <div
                  className={`${styles.budgetFill} ${over ? styles.budgetOver : ''}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn--ghost"
            title="Alle Rezepte als PDF"
            onClick={() =>
              void api.download(
                `/events/${detail.event.id}/exports/recipes`,
                `${detail.event.name}-rezepte.pdf`,
              )
            }
          >
            Rezepte-PDF
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            title="Allergenliste als PDF"
            onClick={() =>
              void api.download(
                `/events/${detail.event.id}/exports/allergens`,
                `${detail.event.name}-allergene.pdf`,
              )
            }
          >
            Allergene
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            title="Gerichte-Labels (Zeltkarten) als PDF"
            onClick={() =>
              void api.download(
                `/events/${detail.event.id}/exports/labels`,
                `${detail.event.name}-labels.pdf`,
              )
            }
          >
            Labels
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setEditOpen(true)}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              mutations.clone.mutate(undefined, {
                onSuccess: (created) => void navigate(`/events/${created.id}`),
              })
            }
            disabled={mutations.clone.isPending}
          >
            Klonen
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Löschen
          </button>
        </div>
      </div>

      <SegmentedControl
        options={[...TAB_OPTIONS]}
        value={tab}
        onChange={onTabChange}
        ariaLabel="Event-Ansicht wählen"
      />

      {tab === 'plan' ? (
        <MealPlanTab detail={detail} />
      ) : (
        <ShoppingTab eventId={detail.event.id} />
      )}

      {editOpen && (
        <EditEventDialog
          eventId={detail.event.id}
          event={detail.event}
          onClose={() => setEditOpen(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Event löschen"
          message={`„${detail.event.name}" inklusive Mahlzeitenplanung und Einkaufstouren wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: () => void navigate('/events'),
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </div>
  )
}
