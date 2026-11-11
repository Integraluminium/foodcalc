import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import type { EventDetail } from '../../api/types'
import { Spinner } from '../../molecules/ui/Spinner'
import { useEvent, useEventMutations } from '../../hooks/queries/useEvents'
import { formatDateRange, formatDecimal, toNumber } from '../../lib/format'
import { t } from '../../i18n'
import type { StringKey } from '../../i18n'
import type { WorkspaceContext } from './workspaceContext'
import styles from './EventWorkspace.module.css'

const TABS = [
  { path: '', labelKey: 'event.tab.overview', end: true },
  { path: 'plan', labelKey: 'event.tab.plan', end: false },
  { path: 'shopping', labelKey: 'event.tab.shopping', end: false },
  { path: 'kalkulation', labelKey: 'event.tab.calc', end: false },
  { path: 'timeline', labelKey: 'event.tab.timeline', end: false },
] as const satisfies readonly { path: string; labelKey: StringKey; end: boolean }[]

/**
 * Event-Workspace (UI_Spec §3.4, Mockup „Detailed view Event"): isolierte
 * Vollseiten-Umgebung pro Event — Topbar mit Kennzahlen, die globale
 * Navigation tritt zurück (Sidebar kollabiert zum Icon-Rail), Phasen als
 * Sub-Routen (`/events/:id/plan` usw., deep-linkable).
 */
export default function EventWorkspace() {
  const params = useParams()
  const eventId = Number(params.eventId)

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return (
      <p className="secondary">
        {t('workspace.invalidId')}{' '}
        <Link to="/events">{t('workspace.backToList')}</Link>
      </p>
    )
  }
  return <WorkspaceLoader eventId={eventId} />
}

function WorkspaceLoader({ eventId }: { eventId: number }) {
  const detail = useEvent(eventId)

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
        {t('workspace.loadError', { error: String(detail.error) })}
      </p>
    )
  }
  return <WorkspaceShell detail={detail.data} />
}

function WorkspaceShell({ detail }: { detail: EventDetail }) {
  const mutations = useEventMutations(detail.event.id)
  const eventId = detail.event.id

  const cost = toNumber(detail.total_cost) ?? 0
  const budget = toNumber(detail.event.budget)
  const share =
    budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null
  const over = budget !== null && cost > budget

  const context: WorkspaceContext = { eventId, detail, mutations }

  return (
    <div className={styles.workspace}>
      <div className={`card ${styles.topbar}`}>
        <div className={styles.topbarMain}>
          <h1 className="section-title">{detail.event.name}</h1>
          <div className={styles.badges}>
            <span className="badge badge--neutral">
              {formatDateRange(
                detail.meals[0]?.start_time ?? null,
                detail.meals[detail.meals.length - 1]?.start_time ?? null,
              )}
            </span>
            <span className="badge badge--info">
              {t('workspace.mealsBadge', { count: detail.meals.length })}
            </span>
            {detail.event.comment && (
              <span className="muted">{detail.event.comment}</span>
            )}
          </div>
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

      <nav className={styles.tabs} aria-label={t('event.areas')}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/events/${eventId}${tab.path ? `/${tab.path}` : ''}`}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
            }
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>

      <Outlet context={context} />
    </div>
  )
}
