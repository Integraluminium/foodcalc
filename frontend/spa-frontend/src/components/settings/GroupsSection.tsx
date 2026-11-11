import { useState } from 'react'
import type { FormEvent } from 'react'
import { Spinner } from '../../molecules/ui/Spinner'
import { usePermissions } from '../../hooks/usePermissions'
import {
  useGroupAdminMutations,
  useGroupMembers,
} from '../../hooks/queries/useUsers'
import { useGroups } from '../../hooks/queries/useMasterData'
import styles from './GroupsSection.module.css'

/**
 * Group management section, shared by the admin page and the settings page.
 * Shows all visible (non-personal) groups with expandable member lists;
 * members of a group and admins can add/remove members, admins can also
 * create and delete groups.
 */
export function GroupsSection() {
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
