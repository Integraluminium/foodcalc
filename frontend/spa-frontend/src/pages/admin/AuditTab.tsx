import {Download} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {AuditEntry, AuditFilter} from '../../api'
import {DataTable, type DataTableColumn} from '../../components/patterns/table/DataTable.tsx'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useAuditExport, useAuditLog} from '../../hooks/queries/useUsers.ts'
import styles from './AdminPage.module.css'

const PAGE_SIZE = 100

/** Admin "Protokoll" tab: filterable audit log with CSV evidence export. */
export default function AuditTab() {
  const {t} = useTranslation(['admin', 'common'])
  const [actionPrefix, setActionPrefix] = useState('')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [page, setPage] = useState(0)
  const exportCsv = useAuditExport()

  const filter: AuditFilter = {
    action: actionPrefix.trim() || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    until: until ? new Date(until).toISOString() : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }
  const query = useAuditLog(filter)

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      key: 'created_at',
      label: t('admin:audit.time'),
      render: (entry) => new Date(entry.created_at).toLocaleString(),
    },
    {key: 'actor_username', label: t('admin:audit.actor'), render: (entry) => entry.actor_username},
    {
      key: 'action',
      label: t('admin:audit.action'),
      render: (entry) => (
        <span className={styles.auditAction}>{entry.action}</span>
      ),
    },
    {
      key: 'target',
      label: t('admin:audit.context'),
      render: (entry) =>
        [
          entry.entity_type ? `${entry.entity_type}#${entry.entity_id ?? '—'}` : null,
          entry.group_id ? `group:${entry.group_id}` : null,
          entry.event_id ? `event:${entry.event_id}` : null,
          entry.target_user_id ? `user:${entry.target_user_id}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—',
    },
    {
      key: 'details',
      label: t('admin:audit.details'),
      render: (entry) => {
        try {
          return (
            <code className={styles.auditDetails}>
              {JSON.stringify(JSON.parse(entry.details))}
            </code>
          )
        } catch {
          return <code className={styles.auditDetails}>{entry.details}</code>
        }
      },
    },
  ]

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.toolbar}>
        <input
          className={`input ${styles.search}`}
          placeholder={t('admin:audit.actionFilter')}
          value={actionPrefix}
          onChange={(event) => {
            setActionPrefix(event.target.value)
            setPage(0)
          }}
        />
        <input
          className="input"
          type="date"
          aria-label={t('admin:audit.from')}
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setPage(0)
          }}
        />
        <input
          className="input"
          type="date"
          aria-label={t('admin:audit.until')}
          value={until}
          onChange={(event) => {
            setUntil(event.target.value)
            setPage(0)
          }}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={exportCsv.isPending}
          onClick={() => void exportCsv.mutateAsync(filter)}
        >
          <Download size={14}/> {t('admin:audit.export')}
        </button>
      </div>

      {query.isPending ? (
        <Spinner/>
      ) : query.isError ? (
        <p className="secondary">
          {t('common:state.error')}: {String(query.error)}
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={query.data?.entries ?? []}
            getRowKey={(entry) => entry.id}
            emptyMessage={t('admin:audit.empty')}
          />
          <div className={styles.auditPager}>
            <span className="muted">
              {t('admin:audit.total', {count: query.data?.total ?? 0})}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              {t('common:actions.prev')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={(page + 1) * PAGE_SIZE >= (query.data?.total ?? 0)}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('common:actions.next')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
