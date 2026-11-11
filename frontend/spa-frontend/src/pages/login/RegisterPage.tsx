import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api'
import { BrandIcon } from '../../components/ui/icons/icons.tsx'
import { Spinner } from '../../components/ui/spinner/Spinner.tsx'
import { useCurrentUser, useRegister } from '../../hooks/useAuth.ts'
import styles from './LoginPage.module.css'

export default function RegisterPage() {
  const { data: user } = useCurrentUser()
  const register = useRegister()
  const navigate = useNavigate()
  const [mismatch, setMismatch] = useState(false)

  // Already signed in → continue to the app.
  if (user) return <Navigate to="/events" replace />

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    if (password !== String(data.get('password2') ?? '')) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    register.mutate(
      {
        username: String(data.get('username') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        password,
      },
      { onSuccess: () => navigate('/events', { replace: true }) },
    )
  }

  const errorMessage = register.isError
    ? register.error instanceof ApiError
      ? register.error.message
      : 'Registrierung fehlgeschlagen.'
    : mismatch
      ? 'Die Passwörter stimmen nicht überein.'
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
        <p className={styles.title}>Konto erstellen</p>
        <label className={styles.label}>
          Benutzername
          <input
            className="input"
            name="username"
            minLength={3}
            autoComplete="username"
            required
            autoFocus
          />
        </label>
        <label className={styles.label}>
          E-Mail
          <input
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className={styles.label}>
          Passwort (mind. 8 Zeichen)
          <input
            className="input"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        <label className={styles.label}>
          Passwort wiederholen
          <input
            className="input"
            name="password2"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={register.isPending}
        >
          {register.isPending ? <Spinner size="sm" /> : 'Registrieren'}
        </button>
        <p className={styles.switch}>
          Schon registriert? <Link to="/login">Anmelden</Link>
        </p>
      </form>
    </div>
  )
}
