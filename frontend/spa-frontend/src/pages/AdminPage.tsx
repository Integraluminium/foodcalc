import { useState } from 'react'
import type { FormEvent } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Spinner } from '../components/ui/Spinner'
import { usePermissions } from '../hooks/usePermissions'
import {
  useGroupAdminMutations,
  useGroupMembers,
  useUserAdminMutations,
  useUsers,
} from '../hooks/queries/useUsers'
import { useGroups } from '../hooks/queries/useMasterData'
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
                <td className="secondary">{row.email}</td>
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
  const { isAdmin, groupIds } = usePermissions()
  const groups = useGroups()
  const { createGroup, removeGroup } = useGroupAdminMutations()
  const [newName, setNewName] = useState('')

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newName.trim()) return
    createGroup.mutate(newName.trim(), {
      onSuccess: () => setNewName(''),
    })
  }

  return (
    <div className={styles.groupsColumn}>
      {isAdmin && (
        <form
          className={`card ${styles.panel} ${styles.createRow}`}
          onSubmit={handleCreate}
        >
          <input
            className="input"
            placeholder="Neuer Gruppenname…"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!newName.trim() || createGroup.isPending}
          >
            + Gruppe anlegen
          </button>
        </form>
      )}

      {groups.isPending ? (
        <Spinner />
      ) : groups.isError ? (
        <p className="secondary">
          Gruppen konnten nicht geladen werden: {String(groups.error)}
        </p>
      ) : (
        groups.data
          .filter((group) => !group.is_personal)
          .map((group) => (
            <GroupCard
              key={group.id}
              groupId={group.id}
              name={group.name}
              canManage={isAdmin || groupIds.includes(group.id)}
              onRemove={() => {
                if (
                  window.confirm(
                    `Gruppe „${group.name}" löschen? Nur möglich, wenn sie keine Ressourcen mehr besitzt.`,
                  )
                ) {
                  removeGroup.mutate(group.id)
                }
              }}
            />
          ))
      )}
      <p className="muted">
        Persönliche Gruppen gehören immer genau einem Benutzer und werden mit
        dem Konto verwaltet.
      </p>
    </div>
  )
}

function GroupCard({
  groupId,
  name,
  canManage,
  onRemove,
}: {
  groupId: number
  name: string
  canManage: boolean
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const members = useGroupMembers(expanded ? groupId : 0)
  const { addMember, removeMember } = useGroupAdminMutations()
  const [newMember, setNewMember] = useState('')

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newMember.trim()) return
    addMember.mutate(
      { groupId, user: newMember.trim() },
      { onSuccess: () => setNewMember('') },
    )
  }

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.groupHeader}>
        <button
          type="button"
          className={styles.groupToggle}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '▾' : '▸'} {name}
        </button>
        {canManage && (
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.iconButton}
              title="Gruppe löschen"
              onClick={onRemove}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {expanded &&
        (members.isPending ? (
          <Spinner size="sm" />
        ) : members.isError ? (
          <p className="secondary">
            Mitglieder konnten nicht geladen werden: {String(members.error)}
          </p>
        ) : (
          <>
            <ul className={styles.memberList}>
              {members.data.map((member) => (
                <li key={member.id} className={styles.memberRow}>
                  <span>
                    {member.username}
                    <span className="muted"> · {member.email}</span>
                    {member.is_admin && (
                      <span className={styles.adminTag}> admin</span>
                    )}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Aus Gruppe entfernen"
                      onClick={() => removeMember.mutate({ groupId, userId: member.id })}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
              {members.data.length === 0 && (
                <li className="muted">Noch keine Mitglieder.</li>
              )}
            </ul>
            {canManage && (
              <form className={styles.addMemberRow} onSubmit={handleAdd}>
                <input
                  className="input"
                  placeholder="Benutzername oder E-Mail…"
                  value={newMember}
                  onChange={(event) => setNewMember(event.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn--ghost"
                  disabled={!newMember.trim() || addMember.isPending}
                >
                  + Hinzufügen
                </button>
              </form>
            )}
          </>
        ))}
    </div>
  )
}
