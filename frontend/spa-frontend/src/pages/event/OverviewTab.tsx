import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroups } from '../../hooks/queries/useMasterData'
import { useEventInventories } from '../../hooks/queries/useEvents'
import { formatDateRange, formatDecimal, toNumber } from '../../lib/format'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ExportButton } from '../../components/ui/ExportButton'
import { t } from '../../i18n'
import styles from '../EventDetailPage.module.css'
import { EditEventDialog } from '../event_detail/EditEventDialog'
import { useWorkspace } from './workspaceContext'

/**
 * Übersicht-Tab (Mockup „Event overview Editing"): Rahmen des Events mit
 * Kennzahlen, gekoppelten Inventaren und den Aktionen — Klonen prominent,
 * weil „Event als Vorlage kopieren & anpassen" der Hauptworkflow für
 * wiederkehrende Caterings ist.
 */
export function OverviewTab() {
  const { detail, mutations } = useWorkspace()
  const navigate = useNavigate()
  const groups = useGroups()
  const linkedInventories = useEventInventories(detail.event.id)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const groupName =
    groups.data?.find((group) => group.id === detail.event.group_id)?.name ??
    t('overview.groupFallback', { id: detail.event.group_id })

  const portions = detail.meals.reduce((sum, meal) => sum + meal.servings, 0)
  const weight = detail.meals.reduce(
    (sum, meal) => sum + (toNumber(meal.weight) ?? 0),
    0,
  )
  const cost = toNumber(detail.total_cost) ?? 0
  const budget = toNumber(detail.event.budget)
  const share =
    budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null
  const over = budget !== null && cost > budget

  return (
    <div className={styles.tabSection}>
      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('overview.frame')}</h3>
          <span className="badge badge--neutral">{groupName}</span>
        </div>
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
          <dd>{portions}</dd>
          <dt>{t('overview.cookingAmount')}</dt>
          <dd>{formatDecimal(weight)} kg</dd>
          <dt>{t('overview.cost')}</dt>
          <dd>
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
          </dd>
          {detail.event.comment && (
            <>
              <dt>{t('overview.comment')}</dt>
              <dd>{detail.event.comment}</dd>
            </>
          )}
        </dl>

        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('overview.linkedInventories')}</h3>
          <span className="muted">{t('overview.linkedInventoriesHint')}</span>
        </div>
        <div className={styles.badges}>
          {(linkedInventories.data ?? []).length === 0 ? (
            <span className="muted">{t('overview.noInventories')}</span>
          ) : (
            (linkedInventories.data ?? []).map((inventory) => (
              <span key={inventory.id} className="badge badge--info">
                {inventory.name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Sammel-Exporte (früher eigener Exporte-Tab) — Einzel-PDFs einer
          Mahlzeit gehören in den Speiseplan-Drawer, Touren-Listen in den
          Einkäufe-Tab. */}
      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('overview.exports')}</h3>
          <span className="muted">{t('overview.exportsHint')}</span>
        </div>
        <div className={styles.exportGrid}>
          <ExportButton
            className="btn btn--primary"
            path={`/events/${detail.event.id}/exports/overview`}
            filename={`${detail.event.name}-uebersicht.pdf`}
            title={t('overview.exportOverviewHint')}
          >
            {t('overview.exportOverview')}
          </ExportButton>
          <ExportButton
            path={`/events/${detail.event.id}/exports/recipes`}
            filename={`${detail.event.name}-rezepte.pdf`}
          >
            {t('overview.exportRecipes')}
          </ExportButton>
          <ExportButton
            path={`/events/${detail.event.id}/exports/allergens`}
            filename={`${detail.event.name}-allergene.pdf`}
          >
            {t('overview.exportAllergens')}
          </ExportButton>
          <ExportButton
            path={`/events/${detail.event.id}/exports/labels`}
            filename={`${detail.event.name}-labels.pdf`}
          >
            {t('overview.exportLabels')}
          </ExportButton>
        </div>
      </div>

      <div className={`card ${styles.dayCard} ${styles.actionsCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('overview.actions')}</h3>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn--primary"
            title={t('overview.cloneHint')}
            onClick={() =>
              mutations.clone.mutate(undefined, {
                onSuccess: (created) => void navigate(`/events/${created.id}`),
              })
            }
            disabled={mutations.clone.isPending}
          >
            {t('overview.clone')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setEditOpen(true)}
          >
            {t('action.edit')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            {t('action.delete')}
          </button>
        </div>
      </div>

      {editOpen && (
        <EditEventDialog
          eventId={detail.event.id}
          event={detail.event}
          onClose={() => setEditOpen(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('overview.deleteTitle')}
          message={t('overview.deleteMessage', { name: detail.event.name })}
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
