import { useState } from 'react'
import type { FormEvent } from 'react'
import type { GroupRole } from '../../../api/types.ts'
import { Spinner } from '../../ui/spinner/Spinner.tsx'
import { usePermissions } from '../../../hooks/usePermissions.ts'
import { t } from '../../../i18n'
import {
  useGroupAdminMutations,
  useGroupMembers,
} from '../../../hooks/queries/useUsers.ts'
import { useGroups } from '../../../hooks/queries/useMasterData.ts'
import styles from './GroupsSection.module.css'

/**
 * Group management section, shared by the admin page and the settings page.
 * Shows all visible (non-personal) groups with expandable member lists;
 * members of a group and admins can add/remove members, admins can also
 * create and delete groups.
 */
export function GroupsSection() {
  const { isAdmin, canManageGroup } = usePermissions()
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
            placeholder={t('rights.createPlaceholder')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!newName.trim() || createGroup.isPending}
          >
            {t('rights.createButton')}
          </button>
        </form>
      )}

      {groups.isPending ? (
        <Spinner />
      ) : groups.isError ? (
        <p className="secondary">
          {t('rights.loadError', { error: String(groups.error) })}
        </p>
      ) : (
        groups.data
          .filter((group) => !group.is_personal)
          .map((group) => (
            <GroupCard
              key={group.id}
              groupId={group.id}
              name={group.name}
              canManage={canManageGroup(group.id)}
              onRemove={() => {
                if (
                  window.confirm(
                    t('rights.deleteGroupConfirm', { name: group.name }),
                  )
                ) {
                  removeGroup.mutate(group.id)
                }
              }}
            />
          ))
      )}
      <div className={styles.legend}>
        <h3 className="section-subtitle">{t('rights.legendTitle')}</h3>
        <p>{t('rights.legendViewer')}</p>
        <p>{t('rights.legendEditor')}</p>
        <p>{t('rights.legendManager')}</p>
      </div>
      <p className="muted">
        {t('rights.personalNote')}
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
  const { addMember, removeMember, setMemberRole } = useGroupAdminMutations()
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
              title={t('rights.deleteGroup')}
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
            {t('rights.membersLoadError', { error: String(members.error) })}
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
                  {canManage ? (
                    <select
                      className={`input ${styles.roleSelect}`}
                      value={member.role}
                      disabled={setMemberRole.isPending}
                      title={t('rights.roleLabel')}
                      onChange={(event) =>
                        setMemberRole.mutate({
                          groupId,
                          userId: member.id,
                          role: event.target.value as GroupRole,
                        })
                      }
                    >
                      <option value="viewer">{t('roles.viewer')}</option>
                      <option value="editor">{t('roles.editor')}</option>
                      <option value="manager">{t('roles.manager')}</option>
                    </select>
                  ) : (
                    <span className="badge badge--neutral">
                      {t(`roles.${member.role}`)}
                    </span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={t('rights.removeMember')}
                      onClick={() => removeMember.mutate({ groupId, userId: member.id })}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
              {members.data.length === 0 && (
                <li className="muted">{t('rights.noMembers')}</li>
              )}
            </ul>
            {setMemberRole.isError && (
              <p className="secondary">
                {setMemberRole.error instanceof Error
                  ? setMemberRole.error.message
                  : t('state.error')}
              </p>
            )}
            {canManage && (
              <form className={styles.addMemberRow} onSubmit={handleAdd}>
                <input
                  className="input"
                  placeholder={t('rights.addMemberPlaceholder')}
                  value={newMember}
                  onChange={(event) => setNewMember(event.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn--ghost"
                  disabled={!newMember.trim() || addMember.isPending}
                >
                  {t('rights.addMemberButton')}
                </button>
              </form>
            )}
          </>
        ))}
    </div>
  )
}
