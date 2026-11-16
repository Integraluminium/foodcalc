import {t} from "i18next";
import {useCallback} from 'react'
import {useGroups} from './useMasterData.ts'

export function useGroupName() {
  const { data: groups } = useGroups()
  return useCallback(
    (groupId: number) =>
      groups?.find((g) => g.id === groupId)?.name ??
     t('events:overview.groupFallback', { id: groupId }),
    [groups],
  )
}