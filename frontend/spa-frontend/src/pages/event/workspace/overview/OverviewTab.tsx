import {Pencil} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from "react-i18next";
import {useNavigate} from 'react-router-dom'
import {BudgetBar} from '../../../../components/patterns/budget_bar/BudgetBar.tsx'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../../components/ui/button/ExportButton.tsx'
import {useEvent, useEventId, useEventInventories, useEventMutations,} from '../../../../hooks/queries/useEvents.ts'
import {useGroupName} from "../../../../hooks/queries/useGroupName.ts";
import {useCurrentUser} from "../../../../hooks/useAuth.ts";
import {eventAggregates} from '../../../../lib/eventAggregation.ts'
import {formatDateRange, formatDecimal, toNumber} from '../../../../lib/format.ts'
import {hasGroupPermission} from "../../../../lib/permissions.ts";
import styles from '../EventDetailPage.module.css'
import {EventMetadataDrawer} from "./EventMetadataDrawer.tsx";

export function OverviewTab() {
  const {t} = useTranslation([])
  const eventId = useEventId()
  const {data: detail} = useEvent(eventId)
  useEventMutations(eventId);
  const linkedInventories = useEventInventories(eventId)
  const groupName = useGroupName()
  // const { canEditGroup, canManageGroup } = usePermissions()
  // const { can } = usePermissions(detail?.event.group_id)
  useNavigate();
  const [editOpen, setEditOpen] = useState(false)

  if (!detail) return null
  const {data: user} = useCurrentUser()
  const editable = hasGroupPermission(user, detail?.event.group_id ?? 0, 'events:manage_meals')
  // const editable = canEditGroup(detail.event.group_id)
  // canManageGroup(detail.event.group_id);
  const aggregates = eventAggregates(detail.meals, detail.total_cost)
  const budget = toNumber(detail.event.budget)

  return (
    <div className="tab-section">
      <CardSection
        title={t('events:overview.frame')}
        actions={
          <div className="row-actions">
            <Badge variant="neutral">{groupName(detail.event.group_id)}</Badge>
            {editable && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={14}/> {t('common:actions.edit')}
              </button>
            )}
          </div>
        }
      >
        <dl className={styles.facts}>
          <dt>{t('events:overview.period')}</dt>
          <dd>
            {formatDateRange(
              detail.meals[0]?.start_time ?? null,
              detail.meals[detail.meals.length - 1]?.start_time ?? null,
            )}
          </dd>
          <dt>{t('events:overview.meals')}</dt>
          <dd>{detail.meals.length}</dd>
          <dt>{t('events:overview.portions')}</dt>
          <dd>{aggregates.portions}</dd>
          <dt>{t('events:overview.cookingAmount')}</dt>
          <dd>{formatDecimal(aggregates.weightKg)} kg</dd>
          <dt>{t('events:overview.cost')}</dt>
          <dd>
            <BudgetBar cost={aggregates.cost} budget={budget}/>
          </dd>
          {detail.event.comment && (
            <>
              <dt>{t('events:overview.comment')}</dt>
              <dd>{detail.event.comment}</dd>
            </>
          )}
          <dt>{t('events:overview.linkedInventories')}</dt>
          <dd className="row-actions">
            {(linkedInventories.data ?? []).length === 0 ? (
              <span className="muted">{t('events:overview.noInventories')}</span>
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
        title={t('events:overview.exports')}
        subtitle={t('events:overview.exportsHint')}
      >
        <div className={styles.exportGrid}>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/overview`}
            filename={`${detail.event.name}-uebersicht.pdf`}
            title={t('events:overview.exportOverviewHint')}
          >
            {t('events:overview.exportOverview')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/recipes`}
            filename={`${detail.event.name}-rezepte.pdf`}
          >
            {t('events:overview.exportRecipes')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/allergens`}
            filename={`${detail.event.name}-allergene.pdf`}
          >
            {t('events:overview.exportAllergens')}
          </ExportButton>
          <ExportButton
            className="btn btn--ghost"
            path={`/events/${detail.event.id}/exports/labels`}
            filename={`${detail.event.name}-labels.pdf`}
          >
            {t('events:overview.exportLabels')}
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