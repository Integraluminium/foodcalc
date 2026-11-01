import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { queryKeys } from '../api/queryKeys'
import type { LoginInput } from '../api/types'

/** The session user, or an error when not logged in. */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  })
}

/**
 * Login: authenticates, then immediately resolves the session user so
 * the caller can navigate without an extra loading flash.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    async mutationFn(input: LoginInput) {
      await authApi.login(input)
      return authApi.me()
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user)
    },
  })
}

/** Logout: invalidates the session and clears the whole query cache. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => queryClient.clear(),
  })
}
