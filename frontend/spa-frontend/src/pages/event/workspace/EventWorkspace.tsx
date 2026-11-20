import {BellRing, CalendarDays, Clock, LayoutDashboard, Pencil, Printer, ShoppingCart, Users, Utensils,} from 'lucide-react'
import {type ReactNode, useState} from 'react'
import {useTranslation} from "react-i18next";
import {Link, Outlet, useLocation, useNavigate, useParams} from 'react-router-dom'
import {WorkspaceLayout} from "../../../components/layout/workspace/WorkSpaceLayout.tsx";
import {BudgetBar} from '../../../components/patterns/budget_bar/BudgetBar.tsx'
import {Badge} from '../../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useEvent} from '../../../hooks/queries/useEvents.ts'
import {eventAggregates} from '../../../lib/eventAggregation.ts'
import {formatDateRange, toNumber} from '../../../lib/format.ts'
import {EventMetadataDrawer} from './overview/EventMetadataDrawer.tsx'

type TabPath = '' | 'plan' | 'shopping' | 'team' | 'kalkulation' | 'timeline' | 'live'

export default function EventWorkspace() {
  const { t } = useTranslation([])
  const { eventId: rawId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [editOpen, setEditOpen] = useState(false)

  const eventId = Number(rawId)
  const isValidId = Number.isFinite(eventId) && eventId > 0

  const detailQuery = useEvent(isValidId ? eventId : 0)

  if (!isValidId) {
    return (
      <p className="secondary">
        {t('events:workspace.invalidId')}{' '}
        <Link to="/events">{t('events:workspace.backToList')}</Link>
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
        {t('events:workspace.loadError', { error: String(detailQuery.error) })}
      </p>
    )
  }

  const detail = detailQuery.data
  const aggregates = eventAggregates(detail.meals, detail.total_cost)
  const budget = toNumber(detail.event.budget)

  const basePath = `/events/${eventId}`
  const activeTab = (pathname.slice(basePath.length).replace(/^\//, '').split('/')[0] || '') as TabPath

  const tabs: { value: TabPath; label: string; icon: ReactNode }[] = [
    { value: '', label:t('events:workspace.tabs.overview'), icon: <LayoutDashboard size={16} /> },
    { value: 'plan', label:t('events:workspace.tabs.plan'), icon: <Utensils size={16} /> },
    { value: 'shopping', label:t('events:workspace.tabs.shopping'), icon: <ShoppingCart size={16} /> },
    { value: 'team', label:t('events:workspace.tabs.team'), icon: <Users size={16} /> },
    { value: 'live', label:t('events:workspace.tabs.live'), icon: <BellRing size={16} /> },
    { value: 'kalkulation', label:t('events:workspace.tabs.calc'), icon: <Printer size={16} /> },
    { value: 'timeline', label:t('events:workspace.tabs.timeline'), icon: <CalendarDays size={16} /> },
  ]

  return (
    <WorkspaceLayout
      title={detail.event.name}
      meta={
        <>
          <Badge variant="success">{t('events:workspace.statusBadge')}</Badge>
          <Badge variant="neutral" icon={<Clock size={12} />}>
            {formatDateRange(
              detail.meals[0]?.start_time ?? null,
              detail.meals[detail.meals.length - 1]?.start_time ?? null,
            )}
          </Badge>
          <Badge variant="info" icon={<Utensils size={12} />}>
            {t('events:workspace.mealsBadge', { count: detail.meals.length })}
          </Badge>
          {detail.event.comment && (
            <span className="muted">{detail.event.comment}</span>
          )}
        </>
      }
      actions={
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setEditOpen(true)}
        >
          <Pencil size={14} /> {t('common:actions.edit')}
        </button>
      }
      summaryRow={<BudgetBar cost={aggregates.cost} budget={budget} />}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => void navigate(tab ? `${basePath}/${tab}` : basePath)}
      tabsAriaLabel={t('events:workspace.areas')}
    >
      <Outlet />

      {editOpen && (
        <EventMetadataDrawer
          event={detail.event}
          onClose={() => setEditOpen(false)}
        />
      )}
    </WorkspaceLayout>
  )
}