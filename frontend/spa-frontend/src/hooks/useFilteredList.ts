import {useMemo, useState} from 'react'
import {useOwnerFilter} from './useOwnerFilter.ts'

/**
 * Combines owner-group filtering with optional client-side text search.
 * Omit `getSearchText` when search is already handled server-side via query params.
 */
export function useFilteredList<T extends { group_id: number }>(
  items: readonly T[] | undefined,
  getSearchText?: (item: T) => string,
) {
  const [search, setSearch] = useState('')
  const { ownerFilter, setOwnerFilter, matches } = useOwnerFilter()

  const filtered = useMemo(() => {
    const query = getSearchText ? search.trim().toLowerCase() : ''
    return (items ?? []).filter((item) => {
      if (!matches(item)) return false
      if (getSearchText && query) {
        return getSearchText(item).toLowerCase().includes(query)
      }
      return true
    })
  }, [items, matches, search, getSearchText])

  return { search, setSearch, ownerFilter, setOwnerFilter, filtered }
}