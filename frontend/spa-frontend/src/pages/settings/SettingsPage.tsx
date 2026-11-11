import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api'
import { SegmentedControl } from '../../components/ui/segented_control/SegmentedControl.tsx'
import { GroupsSection } from '../../components/patterns/settings/GroupsSection.tsx'
import { Spinner } from '../../components/ui/spinner/Spinner.tsx'
import { useCurrentUser } from '../../hooks/useAuth.ts'
import {useUserAdminMutations, useUsers} from '../../hooks/queries/useUsers.ts'
import { useGroups } from '../../hooks/queries/useMasterData.ts'
import styles from './SettingsPage.module.css'
import {ConfirmDialog} from "../../components/ui/dialog/ConfirmDialog.tsx";

type Tab = 'account' | 'groups'

const TAB_OPTIONS = [
  { value: 'account', label: 'Konto' },
  { value: 'groups', label: 'Gruppen' },
] as const

/**
 * Settings hub: own account (profile, password, memberships) and group
 * management. Members can manage the member lists of their groups; admins
 * additionally create/delete groups.
 */
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className={styles.page}>
      <h1 className="section-title">Einstellungen</h1>
      <SegmentedControl
        options={[...TAB_OPTIONS]}
        value={tab}
        onChange={setTab}
        ariaLabel="Einstellungsbereich wählen"
      />
      {tab === 'account' ? <AccountPanel /> : <GroupsSection />}
    </div>
  )
}

function AccountPanel() {
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
    <>
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

      <GroupPanel />
    </>
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


function GroupPanel() {
    const [search, setSearch] = useState('')
    const users = useUsers(search)
    const { update, remove, changePassword } = useUserAdminMutations()
    const [deleteUser, setDeleteUser] = useState<{
        id: number
        username: string
    } | null>(null)

    const updateAdmin = (id: number, is_admin: boolean) =>
        update.mutate({ id, is_admin })

    // TODO: Add group management UI here, similar to the AdminPage, allowing users to manage their groups and memberships.

    return (
        <div className={`card ${styles.panel}`}>
            <div className={styles.toolbar}>
                <input
                    className={`input ${styles.search}`}
                    placeholder="Benutzer suchen (Name / E-Mail)…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <span className="muted">
          {users.data ? `${users.data.length} Benutzer` : ''}
        </span>
            </div>

            {users.isPending ? (
                <Spinner />
            ) : users.isError ? (
                <p className="secondary">
                    Benutzer konnten nicht geladen werden: {String(users.error)}
                </p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Gruppe</th>
                            <th>Berechtigungen</th>
                            <th>Verlassen</th>

                            <th />
                        </tr>
                        </thead>
                        <tbody>
                        {users.data.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    {row.username}
                                    {row.groups.some((group) => group.is_personal) && (
                                        <span className={`muted ${styles.personalTag}`}>
                        {' '}
                                            (persönliche Gruppe)
                      </span>
                                    )}
                                </td>
                                <td className={`secondary ${styles.email}`}>[Berechtigungen]</td>
                                <td className={styles.rowActions}>

                                    <button
                                        type="button"
                                        className={styles.iconButton}
                                        title="Gruppe verlassen"
                                        onClick={() =>
                                            {}
                                        }
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {deleteUser && (
                <ConfirmDialog
                    title="Benutzer löschen"
                    message={`„${deleteUser.username}" inklusive persönlicher Gruppe löschen? Das ist nur möglich, wenn die persönliche Gruppe keine Rezepte/Zutaten/Inventare/Events mehr besitzt.`}
                    onConfirm={() => {
                        remove.mutate(deleteUser.id)
                        setDeleteUser(null)
                    }}
                    onCancel={() => setDeleteUser(null)}
                    pending={remove.isPending}
                />
            )}
        </div>
    )
}