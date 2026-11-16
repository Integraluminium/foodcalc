import {t} from "i18next";
import type {ReactNode} from 'react'
import {SkeletonTable} from '../skeleton/Skeleton'
import {EmptyState, ErrorState} from '../state_views/StateViews'
import styles from './DataTable.module.css'

export interface DataTableColumn<T> {
  key: string
  label: string
  align?: 'num'
  className?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[] | undefined
  getRowKey: (row: T) => React.Key
  onRowClick?: (row: T) => void
  isPending?: boolean
  isError?: boolean
  error?: unknown
  /** Optional noun for error message, e.g. "Inventories" */
  errorNoun?: string
  emptyMessage: string
  /** Should display a chevron in the last column */
  withChevron?: boolean
  highlight?: boolean
}

/**
 * Generic table component with loading, error, and empty states.
 * @param columns Column definitions
 * @param rows Data rows
 * @param getRowKey Function to get a unique key for each row
 * @param onRowClick Optional click handler for rows
 * @param isPending Whether the data is loading
 * @param isError Whether there was an error loading the data
 * @param error Optional error object for display
 * @param errorNoun Optional noun for error message, e.g. "Inventories"
 * @param emptyMessage Message to display when there are no rows
 * @param withChevron Whether to display a chevron in the last column
 */
export function DataTable<T>({
                               columns,
                               rows,
                               getRowKey,
                               onRowClick,
                               isPending = false,
                               isError = false,
                               error = null,
                               errorNoun,
                               emptyMessage,
                               withChevron = false,
                               highlight = true,
                             }: DataTableProps<T>) {
  if (isPending) {
    return (
      <div className={`card ${styles.panel}`} role="status" aria-label={t('common:state.loading')}>
        <SkeletonTable rows={6} cols={columns.length + 1}/>
      </div>
    )
  }
  if (isError) {
    const message = errorNoun
      ? `${errorNoun} konnten nicht geladen werden: ${String(error)}`
      :t('common:state.error')
    return (
      <div className={`${highlight ? "card" : ''} ${styles.panel}`}>
        <ErrorState message={message}/>
      </div>
    )
  }
  if (!rows || rows.length === 0) {
    return (
      <div className={`${highlight ? "card" : ''} ${styles.panel}`}>
        <EmptyState message={emptyMessage}/>
      </div>
    )
  }
  return (
    <div className={`${highlight ? "card" : ''} ${styles.panel}`}>
      <table className="table">
        <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className={column.align === 'num' ? 'num' : column.className}
            >
              {column.label}
            </th>
          ))}
          {withChevron && <th aria-hidden="true"/>}
        </tr>
        </thead>
        <tbody>
        {rows.map((row) => (
          <tr
            key={getRowKey(row)}
            className={onRowClick ? styles.row : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={column.align === 'num' ? 'num' : column.className}
              >
                {column.render(row)}
              </td>
            ))}
            {withChevron && <td className="num muted">›</td>}
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}
