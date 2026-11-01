import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../api/endpoints/master'
import { queryKeys } from '../../api/queryKeys'

const MASTER_STALE_MS = 10 * 60_000

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.master.groups,
    queryFn: masterApi.groups,
    staleTime: MASTER_STALE_MS,
  })
}

export function useStores() {
  return useQuery({
    queryKey: queryKeys.master.stores,
    queryFn: masterApi.stores,
    staleTime: MASTER_STALE_MS,
  })
}

export function useUnits() {
  return useQuery({
    queryKey: queryKeys.master.units,
    queryFn: masterApi.units,
    staleTime: MASTER_STALE_MS,
  })
}

export function useProperties() {
  return useQuery({
    queryKey: queryKeys.master.properties,
    queryFn: masterApi.properties,
    staleTime: MASTER_STALE_MS,
  })
}
