import {Trash2, UserPlus, Users} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {EventMember, RoleSlug} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {ConfirmDialog} from '../../../../components/patterns/dialog/ConfirmDialog.tsx'
import {RoleMatrixLegend} from '../../../../components/patterns/roles/RoleMatrixLegend.tsx'
import {RoleMultiSelect} from '../../../../components/patterns/roles/RoleMultiSelect.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {
  useEvent,
  useEventId,
  useEventMemberMutations,
  useEventMembers,
} from '../../../../hooks/queries/useEvents.ts'
import {useGroupMembers, useRoles} from '../../../../hooks/queries/useUsers.ts'
import {useEventCapability, useGroupPermission} from '../../../../hooks/usePermissions.ts'
import {roleLabel} from '../../../../lib/roles.ts'
import styles from '../EventDetailPage.module.css'

/**
 * D2 event access management: the inherited group baseline (read-only
 * summary) plus the direct per-event collaborators (`event_user_roles`).
 */
export function TeamTab() {
  const {t} = useTranslation(['events', 'settings', 'common'])
  const eventId = useEventId()
  const {data: detail} = useEvent(eventId)
  const {data: roles} = useRoles()
  const {data: members} = useEventMembers(eventId)
  const mutations = useEventMemberMutations(eventId)

  const [memberInput, setMemberInput] = useState('')
  const [memberRoles, setMemberRoles] = useState<RoleSlug[]>(['viewer'])
  const [removeTarget, setRemoveTarget] = useState<EventMember | null>(null)

  const groupId = detail?.event.group_id ?? 0
  const canManageAccess = useEventCapability(detail, 'events:transfer_owner')
  const canSeeGroupMembers = useGroupPermission(groupId, 'group:manage_members')
  const groupMembers = useGroupMembers(canSeeGroupMembers ? groupId : 0)

  if (!detail) return <Spinner/>

  const ownerGroup = groupMembers.data

  const handleAdd = async () => {
    const identifier = memberInput.trim()
    if (!identifier) return
    try {
      await mutations.add.mutateAsync({user: identifier, roles: memberRoles})
      setMemberInput('')
      setMemberRoles(['viewer'])
    } catch {
      // Toast surfaced by the global error handler.
    }
  }

  return (
    <div className="tab-section">
      <CardSection
        title={t('events:team.inheritedTitle')}
        subtitle={t('events:team.inheritedSubtitle')}
      >
        {canSeeGroupMembers && ownerGroup ? (
          <div className={styles.facts}>
            <dt>{t('events:team.groupMembers')}</dt>
            <dd>{ownerGroup.length}</dd>
            <dt>{t('events:team.groupRoles')}</dt>
            <dd className="row-actions">
              {Object.entries(
                ownerGroup.reduce<Record<string, number>>((acc, member) => {
                  for (const slug of member.roles) acc[slug] = (acc[slug] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([slug, count]) => (
                <Badge key={slug} variant="info">
                  {roleLabel(slug, t, roles)} × {count}
                </Badge>
              ))}
            </dd>
          </div>
        ) : (
          <p className="muted">{t('events:team.inheritedNoDetail')}</p>
        )}
      </CardSection>

      <CardSection
        title={t('events:team.directTitle', {count: members?.length ?? 0})}
        subtitle={t('events:team.directSubtitle')}
      >
        <div className={styles.sectionBody}>
          {canManageAccess && (
            <div className="row-actions">
              <input
                className="input"
                style={{minWidth: '14rem'}}
                placeholder={t('events:team.addPlaceholder')}
                value={memberInput}
                onChange={(event) => setMemberInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleAdd()
                }}
              />
              <RoleMultiSelect
                roles={roles}
                value={memberRoles}
                onChange={setMemberRoles}
              />
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!memberInput.trim() || mutations.add.isPending}
                onClick={() => void handleAdd()}
              >
                <UserPlus size={14}/> {t('events:team.addButton')}
              </button>
            </div>
          )}

          {members === undefined ? (
            <Spinner size="sm"/>
          ) : members.length === 0 ? (
            <p className="muted">{t('events:team.empty')}</p>
          ) : (
            <table className="table">
              <thead>
              <tr>
                <th>{t('common:table.name')}</th>
                <th>{t('settings:rights.rolesColumn')}</th>
                {canManageAccess && <th className="num">{t('common:table.actions')}</th>}
              </tr>
              </thead>
              <tbody>
              {members.map((member) => (
                <tr key={member.user_id}>
                  <td>
                    <Users size={12} style={{marginRight: '0.25rem'}}/>
                    {member.username}
                  </td>
                  <td>
                    <RoleMultiSelect
                      roles={roles}
                      value={member.roles}
                      disabled={!canManageAccess}
                      emptyLabel={t('settings:rights.noRoles')}
                      onChange={(next) => {
                        void mutations.setRoles.mutateAsync({
                          userId: member.user_id,
                          roles: next,
                        })
                      }}
                    />
                  </td>
                  {canManageAccess && (
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        title={t('events:team.revoke')}
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              </tbody>
            </table>
          )}
          <p className="muted">{t('events:team.directHint')}</p>
        </div>
      </CardSection>

      <RoleMatrixLegend roles={roles}/>

      {removeTarget && (
        <ConfirmDialog
          title={t('events:team.revokeTitle')}
          message={t('events:team.revokeMessage', {name: removeTarget.username})}
          pending={mutations.remove.isPending}
          onConfirm={() => {
            void mutations.remove
              .mutateAsync(removeTarget.user_id)
              .finally(() => setRemoveTarget(null))
          }}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}
