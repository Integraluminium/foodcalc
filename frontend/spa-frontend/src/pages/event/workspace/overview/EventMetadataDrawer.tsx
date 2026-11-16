import {ArrowRightLeft, Copy, Trash2} from 'lucide-react'
import {type FormEvent, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import type {Event} from '../../../../api'
import {ConfirmDialog} from '../../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../../components/patterns/drawer/Drawer.tsx'
import {OwnerTransferDialog} from '../../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {useCreateEvent, useEventMutations} from '../../../../hooks/queries/useEvents.ts'
import {useGroups} from '../../../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../../../hooks/useAuth.ts'
import {usePermissions} from '../../../../hooks/usePermissions.ts'
import {t} from '../../../../i18n'

interface EventMetadataDialogProps {
  /** `null` = create new event, `Event` = edit existing metadata. */
  event: Event | null
  onClose: () => void
}

export function EventMetadataDrawer({ event, onClose }: EventMetadataDialogProps) {
  const isEdit = event !== null
  const navigate = useNavigate()
  const groups = useGroups()
  const { data: user } = useCurrentUser()
  const create = useCreateEvent()
  const mutations = useEventMutations(event?.id ?? 0)

  const { canEditGroup, canManageGroup } = usePermissions()

  const canSave = !isEdit || canEditGroup(event.group_id)
  const manageable = isEdit && canManageGroup(event.group_id)

  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editableGroups = (user?.groups ?? []).filter((g) => canEditGroup(g.id))
  const personalGroupId =
    editableGroups.find((g) => g.is_personal)?.id ??
    editableGroups[0]?.id ??
    0

  const groupName =
    groups.data?.find((g) => g.id === event?.group_id)?.name ??
    t('overview.groupFallback', { id: event?.group_id ?? 0 })

  const pending = isEdit ? mutations.update.isPending : create.isPending

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const comment = String(data.get('comment') ?? '').trim() || null
    const budget = String(data.get('budget') ?? '').trim() || null

    if (isEdit) {
      mutations.update.mutate({ name, comment, budget }, { onSuccess: onClose })
    } else {
      create.mutate(
        {
          name,
          comment,
          budget,
          group_id: Number(data.get('group_id') ?? 0) || personalGroupId,
        },
        {
          onSuccess: (created) => {
            onClose()
            void navigate(`/events/${created.id}`)
          },
        },
      )
    }
  }

  return (
    <Drawer
      title={isEdit ? t('overview.editTitle') : t('event.titleNew')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('action.cancel')}
          </button>
          {canSave && (
            <button
              type="submit"
              form="event-metadata-form"
              className="btn btn--primary"
              disabled={pending}
            >
              {pending ? <Spinner size="sm" /> : isEdit ? t('action.save') : t('action.create')}
            </button>
          )}
        </>
      }
    >
      <form id="event-metadata-form" onSubmit={handleSubmit}>
        <table className="table table--compact">
          <tbody>
          <tr>
            <td>{t('overview.name')}</td>
            <td>
              <input
                className="input"
                name="name"
                defaultValue={event?.name ?? ''}
                disabled={!canSave}
                required
                autoFocus
              />
            </td>
          </tr>
          <tr>
            <td>{t('overview.ownerGroup')}</td>
            <td>
              {isEdit ? (
                <>
                  <p>{groupName}</p>
                  {manageable && (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setTransferOpen(true)}
                    >
                      <ArrowRightLeft size={14} /> {t('transfer.button')}
                    </button>
                  )}
                </>
              ) : (
                <select
                  className="input"
                  name="group_id"
                  defaultValue={personalGroupId}
                  required
                >
                  {editableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </td>
          </tr>

          <tr>
            <td>{t('overview.budget')}</td>
            <td>
              <input
                className="input"
                name="budget"
                type="number"
                step="any"
                min="0"
                placeholder={t('mealDrawer.optional')}
                defaultValue={event?.budget ?? ''}
                disabled={!canSave}
              />
            </td>
          </tr>

          <tr>
            <td>{t('overview.comment')}</td>
            <td>
                <textarea
                  className="input"
                  name="comment"
                  defaultValue={event?.comment ?? ''}
                  disabled={!canSave}
                />
            </td>
          </tr>

          {isEdit && (
            <tr>
              <td>{t('overview.actions')}</td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    title={t('overview.cloneHint')}
                    disabled={mutations.clone.isPending}
                    onClick={() =>
                      mutations.clone.mutate(undefined, {
                        onSuccess: (created) => {
                          onClose()
                          void navigate(`/events/${created.id}`)
                        },
                      })
                    }
                  >
                    <Copy size={14} /> {t('overview.clone')}
                  </button>

                  {manageable && (
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={14} /> {t('action.delete')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </form>

      {transferOpen && event && (
        <OwnerTransferDialog
          kind="events"
          id={event.id}
          currentGroupId={event.group_id}
          onClose={() => setTransferOpen(false)}
        />
      )}

      {confirmDelete && event && (
        <ConfirmDialog
          title={t('overview.deleteTitle')}
          message={t('overview.deleteMessage', { name: event.name })}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: () => {
                onClose()
                void navigate('/events')
              },
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </Drawer>
  )
}