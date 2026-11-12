import {useState} from 'react'
import type {FormEvent} from 'react'
import {useNavigate} from 'react-router-dom'
import type {Event} from '../../api/types.ts'
import {useCreateEvent, useEventMutations} from '../../hooks/queries/useEvents.ts'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {usePermissions} from '../../hooks/usePermissions.ts'
import {ConfirmDialog} from '../../components/patterns/dialog/ConfirmDialog.tsx'
import {OwnerTransferDialog} from '../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Drawer} from '../../components/patterns/drawer/Drawer.tsx'
import {t} from '../../i18n'

/**
 * Ein Formular-Drawer für Anlegen **und** Bearbeiten (UI_Spec §3.2,
 * Context-Preservation): `event === null` ⇒ Anlegen mit leeren Feldern und
 * wählbarer Owner-Gruppe; sonst Bearbeiten — die Gruppe ist dort nur
 * Anzeige, denn ein Besitzwechsel läuft explizit über die Besitz-Übertragung
 * und nicht implizit beim Speichern. Klonen & Löschen gehören in den
 * Bearbeiten-Footer (Hauptworkflow „Event als Vorlage kopieren“).
 */
export function EventFormDrawer({
    event,
    onClose,
}: {
    event: Event | null
    onClose: () => void
}) {
    const isEdit = event !== null
    const navigate = useNavigate()
    const groups = useGroups()
    const {data: user} = useCurrentUser()
    const personalGroupId =
        user?.groups.find((group) => group.is_personal)?.id ??
        user?.groups[0]?.id ??
        0
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [transferOpen, setTransferOpen] = useState(false)
    const create = useCreateEvent()
    const mutations = useEventMutations(event?.id ?? 0)
    const { canManageGroup } = usePermissions()

    const budgetValue =
        event === null || event.budget === null ? '' : String(event.budget)

    const groupName =
        groups.data?.find((group) => group.id === event?.group_id)?.name ??
        t('overview.groupFallback', {id: event?.group_id ?? 0})

    const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
        formEvent.preventDefault()
        const data = new FormData(formEvent.currentTarget)
        const name = String(data.get('name') ?? '').trim()
        const comment = String(data.get('comment') ?? '').trim() || null
        const budget = String(data.get('budget') ?? '').trim() || null
        if (event) {
            mutations.update.mutate({name, comment, budget}, {onSuccess: onClose})
        } else {
            create.mutate(
                {
                    name,
                    comment,
                    budget,
                    group_id:
                        (Number(data.get('group_id') ?? 0) || personalGroupId) ??
                        groups.data?.[0]?.id ??
                        0,
                },
                {onSuccess: onClose},
            )
        }
    }

    return (
        <>
            <Drawer
                title={isEdit ? 'Event bearbeiten' : 'Neues Event'}
                onClose={onClose}
                footer={
                    isEdit ? (
                        <>
                            <button
                                type="button"
                                className="btn btn--sm"
                                style={{marginRight: 'auto'}}
                                title={t('overview.cloneHint')}
                                onClick={() =>
                                    mutations.clone.mutate(undefined, {
                                        onSuccess: (created) => {
                                            onClose()
                                            void navigate(`/events/${created.id}`)
                                        },
                                    })
                                }
                                disabled={mutations.clone.isPending}
                            >
                                {t('overview.clone')}
                            </button>
                            <button
                                type="button"
                                className="btn btn--danger"
                                onClick={() => setConfirmDelete(true)}
                            >
                                {t('action.delete')}
                            </button>
                            {canManageGroup(event.group_id) && (
                                <button
                                    type="button"
                                    className="btn btn--ghost"
                                    onClick={() => setTransferOpen(true)}
                                >
                                    {t('transfer.button')}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={onClose}
                            >
                                {t('action.cancel')}
                            </button>
                            <button
                                type="submit"
                                form="event-form"
                                className="btn btn--primary"
                                disabled={mutations.update.isPending}
                            >
                                {t('action.save')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={onClose}
                            >
                                {t('action.cancel')}
                            </button>
                            <button
                                type="submit"
                                form="event-form"
                                className="btn btn--primary"
                                disabled={create.isPending}
                            >
                                {create.isPending ? 'Erstellen…' : t('action.create')}
                            </button>
                        </>
                    )
                }
            >
                <form id="event-form" onSubmit={handleSubmit}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
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
                                    placeholder="optional"
                                    defaultValue={budgetValue}
                                />
                            </label>
                            {isEdit ? (
                                <label className="field">
                                    Owner-Gruppe
                                    <input
                                        className="input"
                                        value={groupName}
                                        readOnly
                                        title="Besitz über „Besitz übertragen“ ändern, nicht hier"
                                    />
                                </label>
                            ) : (
                                <label className="field">
                                    Owner-Gruppe
                                    <select
                                        className="input"
                                        name="group_id"
                                        defaultValue={personalGroupId || undefined}
                                    >
                                        {(groups.data ?? []).map((group) => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                                {group.is_personal ? ' (persönlich)' : ''}
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
                                placeholder="optional"
                                defaultValue={event?.comment ?? ''}
                            />
                        </label>
                    </div>
                </form>
            </Drawer>

            {transferOpen && event !== null && (
                <OwnerTransferDialog
                    kind="events"
                    id={event.id}
                    currentGroupId={event.group_id}
                    onClose={() => setTransferOpen(false)}
                />
            )}
            {confirmDelete && event !== null && (
                <ConfirmDialog
                    title={t('overview.deleteTitle')}
                    message={t('overview.deleteMessage', {name: event.name})}
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
        </>
    )
}
