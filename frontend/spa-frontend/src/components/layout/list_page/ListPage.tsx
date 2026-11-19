import type {ReactNode} from 'react'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import type {GroupFilter} from '../../../hooks/useOwnerFilter.ts'
import {GroupFilterSelect} from '../../patterns/group_filter/GroupFilterSelect.tsx'
import {SearchBar} from '../../patterns/searchbar/SearchBar.tsx'
import {DataTable, type DataTableColumn} from '../../patterns/table/DataTable.tsx'
import styles from './ListPage.module.css'

export interface ListPageProps<T> {
  title: string
  createLabel: string
  onCreate: () => void

  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string

  ownerFilter?: GroupFilter
  onOwnerFilterChange?: (value: GroupFilter) => void
  extraFilters?: ReactNode
  canCreateNew: boolean

  columns: readonly DataTableColumn<T>[]
  rows: readonly T[] | undefined
  getRowKey: (row: T) => React.Key
  onRowClick?: (row: T) => void
  isPending?: boolean
  isError?: boolean
  error?: unknown
  errorNoun: string
  emptyMessage: string

  /** Drawers / Modals */
  children?: ReactNode
}

export function ListPage<T>({
                              title,
                              createLabel,
                              onCreate,
                              search,
                              onSearchChange,
                              searchPlaceholder,
                              ownerFilter,
                              onOwnerFilterChange,
                              extraFilters,
                              canCreateNew,
                              columns,
                              rows,
                              getRowKey,
                              onRowClick,
                              isPending,
                              isError,
                              error,
                              errorNoun,
                              emptyMessage,
                              children,
                            }: ListPageProps<T>) {
  const { data: user } = useCurrentUser()
  const userGroups = user?.groups ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">{title}</h1>
        {canCreateNew && ( // TODO: remove hardcoded permission check
          <button type="button" className="btn btn--primary" onClick={onCreate}>
            {createLabel}
          </button>
        )}
      </div>

      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      >
        {extraFilters}
        {ownerFilter !== undefined && onOwnerFilterChange && (
          <GroupFilterSelect
            groups={userGroups}
            value={ownerFilter}
            onChange={onOwnerFilterChange}
          />
        )}
      </SearchBar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        onRowClick={onRowClick}
        isPending={isPending}
        isError={isError}
        error={error}
        errorNoun={errorNoun}
        emptyMessage={emptyMessage}
        withChevron={Boolean(onRowClick)}
      />

      {children}
    </div>
  )
}