import {Plus, Trash2, UserPlus} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {Group, GroupMember} from "../../../api";
import {CardSection} from "../../../components/patterns/card_section/CardSection.tsx";
import {ConfirmDialog} from "../../../components/patterns/dialog/ConfirmDialog.tsx";
import type {DataTableColumn} from "../../../components/patterns/table/DataTable.tsx";
import {DataTable} from "../../../components/patterns/table/DataTable.tsx";
import {Badge} from "../../../components/ui/badge/Badge.tsx";
import {Spinner} from "../../../components/ui/spinner/Spinner.tsx";
import styles from './GroupMasterDetail.module.css'

export type GroupRole = 'viewer' | 'member' | 'admin'

export interface ManagedGroupMember {
  user_id: number
  username: string
  display_name?: string | null
  role: GroupRole
}

export interface ManagedGroup {
  id: number
  name: string
  is_personal: boolean
  members: ManagedGroupMember[]
  settings?: Record<string, unknown>
}

export function GroupMasterDetail({
                                    groups,
                                    groupsPending,
                                    selectedGroupId,
                                    onSelectGroup,
                                    members,
                                    membersPending,
                                    isSystemAdmin,
                                    canManageGroup,
                                    onCreateGroup,
                                    onAddMember,
                                    onChangeMemberRole,
                                    onRemoveMember,
                                    onDeleteGroup,
                                  }: {
  groups: Group[]
  groupsPending: boolean
  selectedGroupId: number | null
  onSelectGroup: (id: number) => void
  members: GroupMember[]
  membersPending: boolean
  isSystemAdmin: boolean
  canManageGroup: (groupId: number) => boolean
  onCreateGroup: (name: string) => Promise<void>
  onAddMember: (groupId: number, identifier: string, role: GroupRole) => Promise<void>
  onChangeMemberRole: (groupId: number, userId: number, role: GroupRole) => Promise<void>
  onRemoveMember: (groupId: number, userId: number) => Promise<void>
  onDeleteGroup: (groupId: number) => Promise<void>
}) {
  const { t } = useTranslation(['settings', 'common'])
  const [search, setSearch] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  const [memberInput, setMemberInput] = useState('')
  const [memberRole, setMemberRole] = useState<GroupRole>('viewer')
  const [addingMember, setAddingMember] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (groupsPending) {
    return <Spinner />
  }

  const visibleGroups = groups.filter(
    (g) => !g.is_personal && g.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const activeGroup =
    visibleGroups.find((g) => g.id === selectedGroupId) ?? visibleGroups[0] ?? null

  const editable =
    activeGroup !== null && (isSystemAdmin || canManageGroup(activeGroup.id))

  const handleCreate = async () => {
    const trimmed = newGroupName.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      await onCreateGroup(trimmed)
      setNewGroupName('')
    } finally {
      setCreating(false)
    }
  }

  const handleAddMember = async () => {
    if (!activeGroup || !memberInput.trim()) return
    setAddingMember(true)
    try {
      await onAddMember(activeGroup.id, memberInput.trim(), memberRole)
      setMemberInput('')
    } finally {
      setAddingMember(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!activeGroup) return
    setDeleting(true)
    try {
      await onDeleteGroup(activeGroup.id)
      setConfirmDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const memberColumns: DataTableColumn<GroupMember>[] = [
    {
      key: 'user',
      label: t('settings:rights.memberCol', 'Mitglied'),
      render: (m) => (
        <div>
          <strong>{m.username}</strong>
          <span className="muted"> · {m.email}</span>
          {m.is_admin && (
            <>
              {' '}
              <Badge variant="info">Admin</Badge>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      label: t('settings:rights.roleLabel', 'Rolle'),
      render: (m) =>
        editable ? (
          <select
            className={`input ${styles.roleSelect}`}
            value={m.role}
            onChange={(e) =>
              void onChangeMemberRole(
                activeGroup!.id,
                m.id,
                e.target.value as GroupRole,
              )
            }
          >
            <option value="viewer">{t('common:roles.viewer', 'Leser')}</option>
            <option value="editor">{t('common:roles.editor', 'Bearbeiter')}</option>
            <option value="manager">{t('common:roles.manager', 'Verwalter')}</option>
          </select>
        ) : (
          <Badge variant={m.role === 'manager' ? 'success' : 'neutral'}>
            {t(`common:roles.${m.role}`)}
          </Badge>
        ),
    },
    ...(editable
      ? [
        {
          key: 'actions',
          label: '',
          align: 'num' as const,
          render: (m: GroupMember) => (
            <button
              type="button"
              className="icon-btn"
              title={t('settings:rights.removeMember', 'Mitglied entfernen')}
              onClick={() => void onRemoveMember(activeGroup!.id, m.id)}
            >
              <Trash2 size={15} />
            </button>
          ),
        },
      ]
      : []),
  ]

  return (
    <div className={styles.layout}>
      <aside className={styles.masterPane}>
        <input
          className="input"
          placeholder={t('settings:rights.searchPlaceholder', 'Gruppen filtern…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isSystemAdmin && (
          <div className={styles.createRow}>
            <input
              className="input"
              placeholder={t('settings:rights.createPlaceholder', 'Neue Gruppe…')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate()
              }}
            />
            <button
              type="button"
              className="btn btn--primary"
              disabled={creating || !newGroupName.trim()}
              onClick={() => void handleCreate()}
              title={t('settings:rights.createButton', 'Erstellen')}
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        <div className={styles.groupList}>
          {visibleGroups.length === 0 ? (
            <p className="muted">{t('settings:rights.empty', 'Keine Gruppen.')}</p>
          ) : (
            visibleGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`${styles.groupItem} ${
                    isSelected ? styles.groupItemActive : ''
                  }`}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div className={styles.groupItemMain}>
                    <span className={styles.groupName}>{group.name}</span>
                    {group.role && (
                      <span className={styles.groupMeta}>
                        {t(`common:roles.${group.role}`)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <div className={styles.detailPane}>
        {!activeGroup ? (
          <CardSection>
            <p className="muted">
              {t('settings:rights.selectHint', 'Wähle links eine Gruppe aus.')}
            </p>
          </CardSection>
        ) : (
          <>
            <CardSection
              title={activeGroup.name}
              subtitle={t('settings:rights.personalNote')}
              actions={
                activeGroup.role && (
                  <Badge
                    variant={
                      activeGroup.role === 'manager'
                        ? 'success'
                        : activeGroup.role === 'editor'
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {t(`common:roles.${activeGroup.role}`)}
                  </Badge>
                )
              }
            >
              <div className={styles.sectionBody}>
                {editable && (
                  <div className={styles.addMemberBar}>
                    <input
                      className={`input ${styles.addMemberInput}`}
                      placeholder={t('settings:rights.addMemberPlaceholder')}
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAddMember()
                      }}
                    />
                    <select
                      className={`input ${styles.roleSelect}`}
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as GroupRole)}
                    >
                      <option value="viewer">{t('common:roles.viewer')}</option>
                      <option value="editor">{t('common:roles.editor')}</option>
                      <option value="manager">{t('common:roles.manager')}</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!memberInput.trim() || addingMember}
                      onClick={() => void handleAddMember()}
                    >
                      <UserPlus size={15} />
                      {t('settings:rights.addMemberButton')}
                    </button>
                  </div>
                )}

                {membersPending ? (
                  <Spinner size="sm" />
                ) : (
                  <DataTable
                    columns={memberColumns}
                    rows={members}
                    getRowKey={(m) => m.id}
                    emptyMessage={t('settings:rights.noMembers')}
                  />
                )}
              </div>
            </CardSection>

            {isSystemAdmin && (
              <CardSection title={t('settings:rights.deleteGroup', 'Gruppe löschen')}>
                <div className={styles.dangerRow}>
                  <span className="muted">
                    {t(
                      'settings:rights.deleteHint',
                      'Löscht die Gruppe dauerhaft, sofern keine Ressourcen mehr zugewiesen sind.',
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 size={15} />
                    {t('settings:rights.deleteGroup')}
                  </button>
                </div>
              </CardSection>
            )}
          </>
        )}
      </div>

      {activeGroup && confirmDeleteOpen && (
        <ConfirmDialog
          title={t('settings:rights.deleteGroup')}
          message={t('settings:rights.deleteGroupConfirm', {
            name: activeGroup.name,
          })}
          pending={deleting}
          onConfirm={() => void handleDeleteGroup()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  )
}