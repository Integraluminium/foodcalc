import {api} from '../client'
import type {AuditFilter, AuditPage} from '../types'

function toQuery(filter: AuditFilter): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

/** Audit log (ISO 27001 A.8.15) — guarded by `admin:view_audit_log`. */
export const auditApi = {
  list: (filter: AuditFilter) =>
    api.get<AuditPage>(`/audit?${toQuery(filter)}`),
  /** CSV evidence export with the same filters (session-cookie download). */
  exportCsv: (filter: AuditFilter) =>
    api.download(`/audit/export?${toQuery(filter)}`, 'foodcalc-audit-log.csv'),
  /** Retention purge; guarded by `admin:manage_settings`. */
  purge: (until: string) =>
    api.delete<{deleted: number}>(`/audit/purge?until=${encodeURIComponent(until)}`),
}
