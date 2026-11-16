import {CalendarDays, LayoutDashboard, Printer, ShoppingCart, Utensils,} from 'lucide-react'
import type {ReactNode} from "react";
import {Link, Outlet, useLocation, useNavigate, useParams} from 'react-router-dom'
import {BudgetBar} from '../../../components/patterns/budget_bar/BudgetBar.tsx'
import {Badge} from '../../../components/ui/badge/Badge.tsx'
import {SegmentedControl} from '../../../components/ui/segmented_control/SegmentedControl.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useEvent, useEventMutations} from '../../../hooks/queries/useEvents.ts'
import {t} from '../../../i18n'
import {eventAggregates} from '../../../lib/eventAggregation.ts'
import {formatDateRange, toNumber} from '../../../lib/format.ts'
import styles from './workspace.module.css'
import type {WorkspaceContext} from './workspaceContext.ts'

type TabPath = '' | 'plan' | 'shopping' | 'kalkulation' | 'timeline'

/**
 * Event-Workspace (UI_Spec §3.4, Mockup „Detailed view Event"): isolierte
 * Vollseiten-Umgebung pro Event — Topbar mit Kennzahlen, Phasen als
 * deep-linkable Sub-Routen (`/events/:id/plan` usw.).
 */
export default function EventWorkspace() {
  const { eventId: rawId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const eventId = Number(rawId)
  const isValidId = Number.isFinite(eventId) && eventId > 0

  const detailQuery = useEvent(isValidId ? eventId : 0)
  const mutations = useEventMutations(isValidId ? eventId : 0)

  if (!isValidId) {
    return (
      <p className="secondary">
        {t('workspace.invalidId')}{' '}
        <Link to="/events">{t('workspace.backToList')}</Link>
      </p>
    )
  }

  if (detailQuery.isPending) {
    return (
      <div className="full-page-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <p className="secondary">
        {t('workspace.loadError', { error: String(detailQuery.error) })}
      </p>
    )
  }

  const detail = detailQuery.data
  const aggregates = eventAggregates(detail.meals, detail.total_cost)
  const budget = toNumber(detail.event.budget)
  const context: WorkspaceContext = { eventId, detail, mutations }

  const basePath = `/events/${eventId}`
  const activeTab = (pathname.slice(basePath.length).replace(/^\//, '').split('/')[0] || '') as TabPath

  const tabs: { value: TabPath; label: string; icon: ReactNode }[] = [
    { value: '', label: t('event.tab.overview'), icon: <LayoutDashboard size={16} /> },
    { value: 'plan', label: t('event.tab.plan'), icon: <Utensils size={16} /> },
    { value: 'shopping', label: t('event.tab.shopping'), icon: <ShoppingCart size={16} /> },
    { value: 'kalkulation', label: t('event.tab.calc'), icon: <Printer size={16} /> },
    { value: 'timeline', label: t('event.tab.timeline'), icon: <CalendarDays size={16} /> },
  ]
  return (
    <div className={styles.workspace}>
      <div className={`card ${styles.topbar}`}>
        <div className={styles.topbarMain}>
          <h1 className="section-title">{detail.event.name}</h1>
          <div className={styles.badges}>
            <Badge variant="neutral">
              {formatDateRange(
                detail.meals[0]?.start_time ?? null,
                detail.meals[detail.meals.length - 1]?.start_time ?? null,
              )}
            </Badge>
            <Badge variant="info">
              {t('workspace.mealsBadge', { count: detail.meals.length })}
            </Badge>
            {detail.event.comment && (
              <span className="muted">{detail.event.comment}</span>
            )}
          </div>
        </div>
        <div className={styles.budgetRow}>
          <BudgetBar cost={aggregates.cost} budget={budget} />
        </div>
      </div>

      <SegmentedControl
        options={tabs}
        value={activeTab}
        onChange={(tab) => void navigate(tab ? `${basePath}/${tab}` : basePath)}
        ariaLabel={t('event.areas')}
      />

      <Outlet context={context} />
    </div>
  )
}