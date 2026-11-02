import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi, usersApi } from '../../api'
import { queryKeys } from '../../api/queryKeys'
import type {
  PasswordChangeInput,
  UserUpdateInput,
} from '../../api/types'

const USERS_ROOT = ['users'] as const
const GROUPS_ROOT = ['groups'] as const

/** Admin user list with group memberships. */
export function useUsers(search: string) {
  return useQuery({
    queryKey: queryKeys.users.list(search),
    queryFn: () => usersApi.list(search || undefined),
  })
}

function useInvalidateUsersGroups() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: USERS_ROOT })
    void queryClient.invalidateQueries({ queryKey: GROUPS_ROOT })
    // Owner pickers read the same endpoint under the master cache key.
    void queryClient.invalidateQueries({ queryKey: ['master', 'groups'] })
  }
}

/** All admin user mutations; each success refreshes users and groups. */
export function useUserAdminMutations() {
  const invalidate = useInvalidateUsersGroups()

  const update = useMutation({
    mutationFn: (args: { id: number } & UserUpdateInput) => {
      const { id, ...input } = args
      return usersApi.update(id, input)
    },
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: invalidate,
  })
  const changePassword = useMutation({
    mutationFn: (args: { id: number } & PasswordChangeInput) => {
      const { id, ...input } = args
      return usersApi.changePassword(id, input)
    },
    onSuccess: invalidate,
  })

  return { update, remove, changePassword }
}

/** Members of one group (admin or group members). */
export function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsApi.members(groupId),
    enabled: groupId > 0,
  })
}

/** Group create/delete plus membership add/remove. */
export function useGroupAdminMutations() {
  const invalidate = useInvalidateUsersGroups()

  const createGroup = useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: invalidate,
  })
  const removeGroup = useMutation({
    mutationFn: (id: number) => groupsApi.remove(id),
    onSuccess: invalidate,
  })
  const addMember = useMutation({
    mutationFn: (args: { groupId: number; user: string }) =>
      groupsApi.addMember(args.groupId, args.user),
    onSuccess: invalidate,
  })
  const removeMember = useMutation({
    mutationFn: (args: { groupId: number; userId: number }) =>
      groupsApi.removeMember(args.groupId, args.userId),
    onSuccess: invalidate,
  })

  return { createGroup, removeGroup, addMember, removeMember }
}
