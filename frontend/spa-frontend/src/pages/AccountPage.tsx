import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api'
import { Spinner } from '../components/ui/Spinner'
import { useCurrentUser } from '../hooks/useAuth'
import { useUserAdminMutations } from '../hooks/queries/useUsers'
import { useGroups } from '../hooks/queries/useMasterData'
import styles from './AccountPage.module.css'

export default function AccountPage() {
  const { data: user } = useCurrentUser()
  const groups = useGroups()
  const [savedPassword, setSavedPassword] = useState(false)

  if (!user) {
    return (
      <div className={styles.page}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className="section-title">Mein Konto</h1>

      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Profil</h2>
        <div className={styles.meta}>
          <span className={styles.field}>
            Benutzername: <strong>{user.username}</strong>
          </span>
          <span className={styles.field}>
            E-Mail: <strong>{user.email}</strong>
          </span>
          <span className={styles.adminBadge}>
            {user.is_admin ? 'Administrator' : 'Mitglied'}
          </span>
        </div>
      </div>

      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Passwort ändern</h2>
        <PasswordForm userId={user.id} onSaved={() => setSavedPassword(true)} />
        {savedPassword && (
          <p className={styles.success}>Passwort erfolgreich geändert.</p>
        )}
      </div>

      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Meine Gruppen</h2>
        <ul className={styles.groupList}>
          {(groups.data ?? []).map((group) => (
            <li key={group.id}>
              {group.name}
              {group.is_personal && <span className="muted"> (persönlich)</span>}
            </li>
          ))}
        </ul>
        <p className="muted">
          Gruppen-Mitgliedschaften werden von den Gruppen-Verwaltern bzw. der
          Administration gepflegt (zu finden unter „Verwaltung", für Admins).
        </p>
      </div>
    </div>
  )
}

function PasswordForm({
  userId,
  onSaved,
}: {
  userId: number
  onSaved: () => void
}) {
  const { changePassword } = useUserAdminMutations()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const current = String(data.get('current') ?? '')
    const next = String(data.get('next') ?? '')
    const repeat = String(data.get('repeat') ?? '')
    if (next !== repeat) return
    changePassword.mutate(
      { id: userId, current_password: current, new_password: next },
      {
        onSuccess: () => {
          ;(event.target as HTMLFormElement).reset()
          onSaved()
        },
      },
    )
  }

  const error =
    changePassword.isError && changePassword.error instanceof ApiError
      ? changePassword.error.message
      : changePassword.isError
        ? 'Änderung fehlgeschlagen.'
        : null

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className="field">
        Aktuelles Passwort
        <input className="input" name="current" type="password" required />
      </label>
      <div className="form-row">
        <label className="field">
          Neues Passwort
          <input
            className="input"
            name="next"
            type="password"
            minLength={8}
            required
          />
        </label>
        <label className="field">
          Wiederholen
          <input
            className="input"
            name="repeat"
            type="password"
            minLength={8}
            required
          />
        </label>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="submit"
        className="btn btn--primary"
        disabled={changePassword.isPending}
      >
        {changePassword.isPending ? <Spinner size="sm" /> : 'Passwort ändern'}
      </button>
    </form>
  )
}
