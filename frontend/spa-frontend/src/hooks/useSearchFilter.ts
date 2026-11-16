import {useMemo, useState} from 'react'

export function useSearchFilter<T>(
  items: readonly T[] | undefined,
  getSearchableText: (item: T) => string,
  extraPredicate?: (item: T) => boolean,
) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (items ?? []).filter((item) => {
      if (extraPredicate && !extraPredicate(item)) return false
      if (!query) return true
      return getSearchableText(item).toLowerCase().includes(query)
    })
  }, [items, search, getSearchableText, extraPredicate])

  return { search, setSearch, filtered }
}