import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api'
import { Spinner } from '../../components/ui/spinner/Spinner.tsx'
import { BrandIcon } from '../../components/ui/icons/icons.tsx'
import { useCurrentUser, useLogin } from '../../hooks/useAuth.ts'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { data: user } = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/events'

  // Already signed in → continue to the intended page.
  if (user) return <Navigate to={from} replace />

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    login.mutate(
      {
        username: String(data.get('username') ?? ''),
        password: String(data.get('password') ?? ''),
      },
      { onSuccess: () => navigate(from, { replace: true }) },
    )
  }

  const errorMessage =
    login.isError && login.error instanceof ApiError
      ? login.error.message
      : login.isError
        ? 'Login fehlgeschlagen.'
        : null

  return (
    <div className={styles.page}>
      <form className={`${styles.card} card`} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <BrandIcon size={20} />
          </span>
          <span className={styles.brandName}>Foodcalc</span>
        </div>
        <p className={styles.title}>Anmelden</p>
        <label className={styles.label}>
          Benutzername
          <input
            className="input"
            name="username"
            autoComplete="username"
            required
            autoFocus
          />
        </label>
        <label className={styles.label}>
          Passwort
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={login.isPending}
        >
          {login.isPending ? <Spinner size="sm" /> : 'Anmelden'}
        </button>
        <p className={styles.switch}>
          Noch kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </form>
    </div>
  )
}
