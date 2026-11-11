import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/dialog/ConfirmDialog.tsx'
import { SegmentedControl } from '../../components/ui/segented_control/SegmentedControl.tsx'
import { GroupsSection } from '../../components/patterns/settings/GroupsSection.tsx'
import { Spinner } from '../../components/ui/spinner/Spinner.tsx'
import { usePermissions } from '../../hooks/usePermissions.ts'
import {
  useUserAdminMutations,
  useUsers,
} from '../../hooks/queries/useUsers.ts'
import styles from './AdminPage.module.css'

type Tab = 'users' | 'groups'

const TAB_OPTIONS = [
  { value: 'users', label: 'Benutzer' },
  { value: 'groups', label: 'Gruppen' },
] as const

export default function AdminPage() {
  const { isAdmin } = usePermissions()
  const [tab, setTab] = useState<Tab>('users')

  if (!isAdmin) {
    return (
      <p className="secondary">
        Diese Seite ist Administratoren vorbehalten.
      </p>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Verwaltung</h1>
        <SegmentedControl
          options={[...TAB_OPTIONS]}
          value={tab}
          onChange={setTab}
          ariaLabel="Verwaltungsbereich wählen"
        />
      </div>
      {tab === 'users' ? <UsersPanel /> : <GroupsPanel />}
    </div>
  )
}

// ------------------------------------------------------------------- users

function UsersPanel() {
  const [search, setSearch] = useState('')
  const users = useUsers(search)
  const { update, remove, changePassword } = useUserAdminMutations()
  const [deleteUser, setDeleteUser] = useState<{
    id: number
    username: string
  } | null>(null)

  const updateAdmin = (id: number, is_admin: boolean) =>
    update.mutate({ id, is_admin })

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
                <th>Benutzer</th>
                <th>E-Mail</th>
                <th>Gruppen</th>
                <th className="num">Admin</th>
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
                  <td className={`secondary ${styles.email}`}>{row.email}</td>
                <td>
                  {row.groups.map((group) => group.name).join(', ') || '–'}
                </td>
                <td className="num">
                  <input
                    type="checkbox"
                    checked={row.is_admin}
                    title="Admin-Status umschalten"
                    onChange={() =>
                      updateAdmin(row.id, !row.is_admin)
                    }
                  />
                </td>
                <td className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Passwort zurücksetzen"
                    onClick={() => {
                      const newPassword = window.prompt(
                        `Neues Passwort für ${row.username} (mind. 8 Zeichen):`,
                      )
                      if (newPassword && newPassword.length >= 8) {
                        changePassword.mutate({
                          id: row.id,
                          new_password: newPassword,
                        })
                      }
                    }}
                  >
                    🔑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Benutzer löschen"
                    onClick={() =>
                      setDeleteUser({ id: row.id, username: row.username })
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

// ------------------------------------------------------------------ groups


function GroupsPanel() {
  return <GroupsSection />
}
