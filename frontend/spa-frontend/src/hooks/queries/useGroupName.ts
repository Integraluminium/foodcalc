import {useCallback} from 'react'
import {t} from '../../i18n'
import {useGroups} from './useMasterData.ts'

export function useGroupName() {
  const { data: groups } = useGroups()
  return useCallback(
    (groupId: number) =>
      groups?.find((g) => g.id === groupId)?.name ??
      t('overview.groupFallback', { id: groupId }),
    [groups],
  )
}