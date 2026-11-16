import {Pencil} from 'lucide-react'
import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {BudgetBar} from '../../../../components/patterns/budget_bar/BudgetBar.tsx'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../../components/ui/button/ExportButton.tsx'
import {useEvent, useEventId, useEventInventories, useEventMutations,} from '../../../../hooks/queries/useEvents.ts'
import {useGroupName} from "../../../../hooks/queries/useGroupName.ts";
import {usePermissions} from '../../../../hooks/usePermissions.ts'
import {t} from '../../../../i18n'
import {eventAggregates} from '../../../../lib/eventAggregation.ts'
import {formatDateRange, formatDecimal, toNumber} from '../../../../lib/format.ts'
import {EventMetadataDrawer} from "../../EventMetadataDrawer.tsx";
import styles from '../EventDetailPage.module.css'

export function OverviewTab() {
  const eventId = useEventId()
  const { data: detail } = useEvent(eventId)
  const mutations = useEventMutations(eventId)
  const linkedInventories = useEventInventories(eventId)
  const groupName = useGroupName()
  const { canEditGroup, canManageGroup } = usePermissions()
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)

  if (!detail) return null

  const editable = canEditGroup(detail.event.group_id)
  const manageable = canManageGroup(detail.event.group_id)
  const aggregates = eventAggregates(detail.meals, detail.total_cost)
  const budget = toNumber(detail.event.budget)

  return (
    <div className="tab-section">
      <CardSection
        title={t('overview.frame')}
        actions={
          <div className="row-actions">
            <Badge variant="neutral">{groupName(detail.event.group_id)}</Badge>
            {editable && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={14} /> {t('action.edit')}
              </button>
            )}
          </div>
        }
      >
        <dl className={styles.facts}>
          <dt>{t('overview.period')}</dt>
          <dd>
            {formatDateRange(
              detail.meals[0]?.start_time ?? null,
              detail.meals[detail.meals.length - 1]?.start_time ?? null,
            )}
          </dd>
          <dt>{t('overview.meals')}</dt>
          <dd>{detail.meals.length}</dd>
          <dt>{t('overview.portions')}</dt>
          <dd>{aggregates.portions}</dd>
          <dt>{t('overview.cookingAmount')}</dt>
          <dd>{formatDecimal(aggregates.weightKg)} kg</dd>
          <dt>{t('overview.cost')}</dt>
          <dd>
            <BudgetBar cost={aggregates.cost} budget={budget} />
          </dd>
          {detail.event.comment && (
            <>
              <dt>{t('overview.comment')}</dt>
              <dd>{detail.event.comment}</dd>
            </>
          )}
          <dt>{t('overview.linkedInventories')}</dt>
          <dd className="row-actions">
            {(linkedInventories.data ?? []).length === 0 ? (
              <span className="muted">{t('overview.noInventories')}</span>
            ) : (
              (linkedInventories.data ?? []).map((inv) => (
                <Badge key={inv.id} variant="info">
                  {inv.name}
                </Badge>
              ))
            )}
          </dd>
        </dl>
      </CardSection>

      <CardSection
        title={t('overview.exports')}
        subtitle={t('overview.exportsHint')}
      >
        <div className={styles.exportGrid}>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/overview`}
            filename={`${detail.event.name}-uebersicht.pdf`}
            title={t('overview.exportOverviewHint')}
          >
            {t('overview.exportOverview')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/recipes`}
            filename={`${detail.event.name}-rezepte.pdf`}
          >
            {t('overview.exportRecipes')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/allergens`}
            filename={`${detail.event.name}-allergene.pdf`}
          >
            {t('overview.exportAllergens')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/labels`}
            filename={`${detail.event.name}-labels.pdf`}
          >
            {t('overview.exportLabels')}
          </ExportButton>
        </div>
      </CardSection>

      {editOpen && (
        <EventMetadataDrawer
          event={detail.event}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}