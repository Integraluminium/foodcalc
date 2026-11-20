import {Plus, Trash2, UserPlus} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {Group, GroupMember, RoleSlug} from '../../../api'
import {CardSection} from '../../../components/patterns/card_section/CardSection.tsx'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Badge} from '../../../components/ui/badge/Badge.tsx'
import {MemberRoleDetailDrawer} from '../../../components/patterns/roles/MemberRoleDetailDrawer.tsx'
import {RoleMatrixLegend} from '../../../components/patterns/roles/RoleMatrixLegend.tsx'
import {RoleMultiSelect} from '../../../components/patterns/roles/RoleMultiSelect.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {
  useGroupAdminMutations,
  useGroupDefaultRoles,
  useGroupDefaultRolesMutations,
  useGroupMembers,
  useRoles,
} from '../../../hooks/queries/useUsers.ts'
import {useGroupPermission} from '../../../hooks/usePermissions.ts'
import {roleLabel} from '../../../lib/roles.ts'
import styles from './GroupMasterDetail.module.css'

const MANAGE_MEMBERS = 'group:manage_members'
const MANAGE_SETTINGS = 'group:manage_settings'

export interface GroupMasterDetailProps {
  groups: Group[]
  groupsPending: boolean
  selectedGroupId: number | null
  onSelectGroup: (id: number) => void
  /** Optional create callback; when absent the create bar is hidden. */
  onCreateGroup?: (name: string) => Promise<void>
}

interface DrawerTarget {
  userId: number
  username: string
  roles: RoleSlug[]
}

/**
 * UX-C group permission management: preset add-bar, inline role pills with
 * a popover checklist, per-member detail drawer with the effective
 * permission preview, configurable default roles and a catalog-rendered
 * role matrix. Everything below renders from `GET /api/roles`.
 */
export function GroupMasterDetail({
  groups,
  groupsPending,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
}: GroupMasterDetailProps) {
  const {t} = useTranslation(['settings', 'common'])
  const {data: roles} = useRoles()
  const {addMember, removeMember, setMemberRoles: setMemberRolesMutation, removeGroup} =
    useGroupAdminMutations()

  const [search, setSearch] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [memberRoles, setMemberRoles] = useState<RoleSlug[]>([])
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<GroupMember | null>(null)
  const [defaultsDraft, setDefaultsDraft] = useState<RoleSlug[] | null>(null)

  const visibleGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const activeGroup =
    visibleGroups.find((g) => g.id === selectedGroupId) ?? visibleGroups[0] ?? null
  const activeGroupId = activeGroup?.id ?? 0

  // Hooks stay unconditional; inactive/zero ids simply resolve to `false`.
  // Queries are gated on the same permissions the backend enforces, so groups
  // without manage rights never fire the guarded endpoints (no 401/403).
  const canManageMembers = useGroupPermission(activeGroupId, MANAGE_MEMBERS)
  const canManageSettings = useGroupPermission(activeGroupId, MANAGE_SETTINGS)
  const canDeleteGroup = useGroupPermission(activeGroupId, 'group:delete')
  // Member list: backend allows any member (or user admin) to view it —
  // shown read-only for non-managers, so it is not gated on permissions.
  const members = useGroupMembers(activeGroupId)
  // Only fires when the session user holds `group:manage_settings` — the same
  // guard the backend enforces — so restricted groups never produce 401/403.
  const defaultsQuery = useGroupDefaultRoles(activeGroupId, canManageSettings)
  const defaultsMutations = useGroupDefaultRolesMutations(activeGroupId)

  if (groupsPending) return <Spinner/>

  const memberRows = members.data ?? []

  // Sole holder of `group:manage_members` may not lose that role (backend
  // enforces the same invariant — mirrored here so the UI shows a lock).
  const holders = memberRows.filter((member) =>
    member.roles.some(
      (slug) =>
        roles?.find((role) => role.slug === slug)?.permissions.includes(MANAGE_MEMBERS) ??
        false,
    ),
  )
  const lockedRolesFor = (member: GroupMember): string[] =>
    holders.length === 1 &&
    holders[0].id === member.id &&
    member.roles.includes(MANAGE_MEMBERS)
      ? [MANAGE_MEMBERS]
      : []
  const lockedReason = t('settings:rights.lastManagerHint')

  const handleAddMember = async () => {
    const identifier = memberInput.trim()
    if (!identifier || !activeGroup) return
    try {
      await addMember.mutateAsync({
        groupId: activeGroup.id,
        user: identifier,
        roles: memberRoles.length > 0 ? memberRoles : undefined,
      })
      setMemberInput('')
      setMemberRoles([])
    } catch {
      // Toasts are surfaced by the global error handler.
    }
  }

  const handleDeleteGroup = async () => {
    if (!activeGroup) return
    try {
      await removeGroup.mutateAsync(activeGroup.id)
    } finally {
      setConfirmDeleteGroup(false)
    }
  }

  const defaultRoles = defaultsQuery.data?.roles ?? null
  const resolvedDefaults = defaultsQuery.data?.resolved ?? []
  const defaultsValue = defaultsDraft ?? defaultRoles ?? []

  return (
    <div className={styles.layout}>
      <aside className={styles.masterPane}>
        <input
          className="input"
          placeholder={t('settings:rights.searchGroup')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className={styles.groupList}>
          {visibleGroups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                className={`${styles.groupItem} ${group.id === activeGroup?.id ? styles.groupItemActive : ''}`}
                onClick={() => onSelectGroup(group.id)}
              >
                <span className={styles.groupItemMain}>
                  <span className={styles.groupName}>{group.name}</span>
                  <span className={styles.groupMeta}>
                    {(group.roles ?? []).map((slug) => (
                      <Badge key={slug} variant="neutral">
                        {roleLabel(slug, t, roles)}
                      </Badge>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {onCreateGroup && (
          <div className={styles.createRow}>
            <input
              className="input"
              placeholder={t('settings:rights.newGroupName')}
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newGroupName.trim()) {
                  void onCreateGroup(newGroupName.trim()).then(() => setNewGroupName(''))
                }
              }}
            />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!newGroupName.trim()}
              onClick={() => {
                void onCreateGroup(newGroupName.trim()).then(() => setNewGroupName(''))
              }}
            >
              <Plus size={14}/> {t('settings:rights.createGroup')}
            </button>
          </div>
        )}
      </aside>

      <div className={styles.detailPane}>
        {activeGroup === null ? (
          <p className="muted">{t('settings:rights.noGroups')}</p>
        ) : (
          <>
            <CardSection
              title={t('settings:rights.defaultsTitle')}
              subtitle={t('settings:rights.defaultsSubtitle')}
            >
              {canManageSettings ? (
                <div className={styles.sectionBody}>
                  {defaultsQuery.isPending ? (
                    <Spinner size="sm"/>
                  ) : (
                    <>
                      <RoleMultiSelect
                        roles={roles}
                        value={defaultsValue}
                        onChange={(next) => setDefaultsDraft(next)}
                        emptyLabel={t('settings:rights.defaultsEmpty')}
                      />
                      <p className="muted">
                        {t('settings:rights.defaultsResolved', {
                          roles:
                            resolvedDefaults
                              .map((slug) => roleLabel(slug, t, roles))
                              .join(', ') || '—',
                        })}
                      </p>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={defaultsValue.length === 0 || defaultsMutations.set.isPending}
                          onClick={() => {
                            void defaultsMutations.set
                              .mutateAsync(defaultsValue)
                              .then(() => setDefaultsDraft(null))
                          }}
                        >
                          {t('common:actions.save')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={defaultsQuery.data?.inherited ?? false}
                          onClick={() => {
                            void defaultsMutations.clear.mutateAsync().then(() => setDefaultsDraft(null))
                          }}
                        >
                          {t('settings:rights.defaultsReset')}
                        </button>
                      </div>
                      {defaultsQuery.data?.inherited && (
                        <p className="muted">{t('settings:rights.defaultsInherited')}</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="muted">{t('settings:rights.defaultsNoPermission')}</p>
              )}
            </CardSection>

            <CardSection
              title={t('settings:rights.membersTitle', {count: memberRows.length})}
              actions={
                <span className="muted">
                  {t('settings:rights.ownGroupRoles', {
                    roles: (activeGroup.roles ?? [])
                      .map((slug) => roleLabel(slug, t, roles))
                      .join(', '),
                  })}
                </span>
              }
            >
              <div className={styles.sectionBody}>
                {canManageMembers && (
                  <div className={styles.addMemberBar}>
                    <input
                      className={`input ${styles.addMemberInput}`}
                      placeholder={t('settings:rights.addMemberPlaceholder')}
                      value={memberInput}
                      onChange={(event) => setMemberInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void handleAddMember()
                      }}
                    />
                    <RoleMultiSelect
                      roles={roles}
                      value={memberRoles}
                      onChange={setMemberRoles}
                      emptyLabel={t('settings:rights.addMemberDefaultHint')}
                    />
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!memberInput.trim() || addMember.isPending}
                      onClick={() => void handleAddMember()}
                    >
                      <UserPlus size={14}/> {t('settings:rights.addMemberButton')}
                    </button>
                  </div>
                )}

                {members.isPending ? (
                  <Spinner size="sm"/>
                ) : (
                  <table className="table">
                    <thead>
                    <tr>
                      <th>{t('common:table.name')}</th>
                      <th>{t('settings:rights.rolesColumn')}</th>
                      <th className="num">{t('common:table.actions')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {memberRows.map((member) => (
                      <tr key={member.id}>
                        <td>
                          {member.username}
                          <span className="muted"> · {member.email}</span>
                        </td>
                        <td>
                          <RoleMultiSelect
                            roles={roles}
                            value={member.roles}
                            disabled={!canManageMembers}
                            lockedRoles={lockedRolesFor(member)}
                            lockedReason={lockedReason}
                            emptyLabel={t('settings:rights.noRoles')}
                            onChange={(next) => {
                              void setMemberRolesMutation.mutateAsync({
                                groupId: activeGroup.id,
                                userId: member.id,
                                roles: next,
                              })
                            }}
                          />
                        </td>
                        <td className="num">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setDrawer({
                                  userId: member.id,
                                  username: member.username,
                                  roles: member.roles,
                                })
                              }
                            >
                              {t('settings:rights.details')}
                            </button>
                            {canManageMembers && (
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                title={t('common:actions.delete')}
                                onClick={() => setConfirmRemoveMember(member)}
                              >
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardSection>

            <RoleMatrixLegend roles={roles}/>

            {canDeleteGroup && (
              <CardSection title={t('settings:rights.deleteGroup')}>
                <div className={styles.dangerRow}>
                  <span className="muted">{t('settings:rights.deleteHint')}</span>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => setConfirmDeleteGroup(true)}
                  >
                    <Trash2 size={15}/> {t('settings:rights.deleteGroup')}
                  </button>
                </div>
              </CardSection>
            )}
          </>
        )}
      </div>

      {drawer && (
        <MemberRoleDetailDrawer
          memberName={drawer.username}
          roles={roles}
          value={drawer.roles}
          lockedRoles={(() => {
            const member = memberRows.find((m) => m.id === drawer.userId)
            return member ? lockedRolesFor(member) : []
          })()}
          lockedReason={lockedReason}
          onChange={(next) => {
            setDrawer({...drawer, roles: next})
            if (activeGroup) {
              void setMemberRolesMutation.mutateAsync({
                groupId: activeGroup.id,
                userId: drawer.userId,
                roles: next,
              })
            }
          }}
          onClose={() => setDrawer(null)}
        />
      )}

      {confirmRemoveMember && activeGroup && (
        <ConfirmDialog
          title={t('settings:rights.removeMemberTitle')}
          message={t('settings:rights.removeMemberMessage', {
            name: confirmRemoveMember.username,
          })}
          pending={removeMember.isPending}
          onConfirm={() => {
            void removeMember
              .mutateAsync({groupId: activeGroup.id, userId: confirmRemoveMember.id})
              .finally(() => setConfirmRemoveMember(null))
          }}
          onCancel={() => setConfirmRemoveMember(null)}
        />
      )}

      {activeGroup && confirmDeleteGroup && (
        <ConfirmDialog
          title={t('settings:rights.deleteGroup')}
          message={t('settings:rights.deleteGroupConfirm', {name: activeGroup.name})}
          pending={removeGroup.isPending}
          onConfirm={() => void handleDeleteGroup()}
          onCancel={() => setConfirmDeleteGroup(false)}
        />
      )}
    </div>
  )
}
