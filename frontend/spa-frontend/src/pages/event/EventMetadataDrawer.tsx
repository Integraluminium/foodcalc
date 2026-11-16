import {ArrowRightLeft, Copy, Trash2} from "lucide-react";
import {type FormEvent, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import type {Event} from '../../api'
import {CardSection} from '../../components/patterns/card_section/CardSection.tsx';
import {ConfirmDialog} from "../../components/patterns/dialog/ConfirmDialog.tsx";
import {Drawer} from "../../components/patterns/drawer/Drawer.tsx";
import {OwnerTransferDialog} from "../../components/patterns/owner_transfer/OwnerTransferDialog.tsx";
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useCreateEvent, useEventMutations} from '../../hooks/queries/useEvents.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {usePermissions} from "../../hooks/usePermissions.ts";
import {t} from '../../i18n'

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


  const editable = event !== null && canEditGroup(event.group_id)
  const manageable = event !== null && canManageGroup(event.group_id)

  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)




  const personalGroupId =
    user?.groups.find((g) => g.is_personal)?.id ??
    user?.groups[0]?.id ??
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
          <button
            type="submit"
            form="event-metadata-form"
            className="btn btn--primary"
            disabled={pending}
          >
            {pending ? <Spinner size="sm" /> : isEdit ? t('action.save') : t('action.create')}
          </button>
        </>
      }
    >

      {editable && (
        <CardSection title={t('overview.actions')}>
          <div className="tab-toolbar">
            <button
              type="button"
              className="btn btn--ghost"
              title={t('overview.cloneHint')}
              disabled={mutations.clone.isPending}
              onClick={() =>
                mutations.clone.mutate(undefined, {
                  onSuccess: (created) => void navigate(`/events/${created.id}`),
                })
              }
            >
              <Copy size={14} /> {t('overview.clone')}
            </button>

            <div className="row-actions">
              {manageable && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setTransferOpen(true)}
                >
                  <ArrowRightLeft size={14} /> {t('transfer.button')}
                </button>
              )}
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} /> {t('action.delete')}
              </button>
            </div>
          </div>
        </CardSection>
      )}

      <form id="event-metadata-form" className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          {t('overview.name')}
          <input
            className="input"
            name="name"
            defaultValue={event?.name ?? ''}
            required
            autoFocus
          />
        </label>

        <div className="form-row">
          <label className="field">
            {t('overview.budget')}
            <input
              className="input"
              name="budget"
              type="number"
              step="any"
              min="0"
              placeholder={t('mealDrawer.optional')}
              defaultValue={event?.budget ?? ''}
            />
          </label>

          {isEdit ? (
            <label className="field">
              {t('overview.ownerGroup')}
              <input className="input" value={groupName} readOnly />
            </label>
          ) : (
            <label className="field">
              {t('overview.ownerGroup')}
              <select
                className="input"
                name="group_id"
                defaultValue={personalGroupId || undefined}
              >
                {(groups.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ` (${t('group.personal')})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="field">
          {t('overview.comment')}
          <textarea
            className="input"
            name="comment"
            rows={3}
            placeholder={t('mealDrawer.optional')}
            defaultValue={event?.comment ?? ''}
          />
        </label>
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
              onSuccess: () => void navigate('/events'),
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </Drawer>
  )
}