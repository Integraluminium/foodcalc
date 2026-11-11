import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler } from '../../api'
import { useCurrentUser } from '../../hooks/useAuth.ts'
import { Spinner } from '../ui/spinner/Spinner.tsx'

/**
 * Route guard: renders its children only for authenticated users.
 *
 * Redirects to `/login` when the session check fails, and also reacts
 * to 401s that happen later mid-session (expired cookie) via the API
 * client's unauthorized handler.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useCurrentUser()
  const navigate = useNavigate()

  useEffect(() => {
    setUnauthorizedHandler(() => navigate('/login', { replace: true }))
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  if (isPending) {
    return (
      <div className="full-page-center">
        <Spinner size="lg" />
      </div>
    )
  }
  if (isError || !data) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
