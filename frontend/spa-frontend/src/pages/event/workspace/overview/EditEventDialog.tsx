import type {FormEvent} from 'react'
import {useEventMutations} from '../../../../hooks/queries/useEvents.ts'
import type {Event} from '../../../../api/types.ts'
import {Drawer} from "../../../../components/ui/drawer/Drawer.tsx";
import {t} from "../../../../i18n";

/** Edit the event's frame data (name, budget, comment). */
export function EditEventDialog({
                                    eventId,
                                    event,
                                    onClose,
                                }: {
    eventId: number
    event: Event
    onClose: () => void
}) {
    const mutations = useEventMutations(eventId)

    const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
        formEvent.preventDefault()
        const data = new FormData(formEvent.currentTarget)
        mutations.update.mutate(
            {
                name: String(data.get('name') ?? '').trim(),
                comment: String(data.get('comment') ?? '').trim(),
                budget: String(data.get('budget') ?? '').trim(),
            },
            {onSuccess: onClose},
        )
    }

    return (
        <Drawer
            title="Event bearbeiten"
            onClose={onClose}
            // footer={
            //   <>
            //     <button type="button" className="btn btn--ghost" onClick={onClose}>
            //       Abbrechen
            //     </button>
            //     <button
            //       type="submit"
            //       form="edit-event-form"
            //       className="btn btn--primary"
            //       disabled={mutations.update.isPending}
            //     >
            //       Speichern
            //     </button>
            //   </>
            // }
        >
            <form id="edit-event-form" onSubmit={handleSubmit}>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                    <label className="field">
                        {t('overview.name')}
                        <input
                            className="input"
                            name="name"
                            defaultValue={event.name}
                            required
                        />
                    </label>
                    <label className="field">
                        {t('overview.budget')}
                        <input
                            className="input"
                            name="budget"
                            type="number"
                            step="any"
                            min="0"
                            defaultValue={event.budget === null ? '' : String(event.budget)}
                        />
                    </label>
                    <label className="field">
                        {t('overview.comment')}
                        <textarea
                            className="input"
                            name="comment"
                            defaultValue={event.comment ?? ''}
                        />
                    </label>
                </div>
            </form>

            <hr/>
            <> // TODO: footer buttons should be in the drawer footer, but we need to fix the layout first
                <button
                    type="button"
                    className="btn btn--sm"
                    title={t('overview.cloneHint')}
                    onClick={() =>
                        mutations.clone.mutate(undefined, {
                            onSuccess: (created) => void navigate(`/events/${created.id}`),
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
                <>
                    <button type="button" className="btn btn--ghost" onClick={onClose}>
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        form="edit-event-form"
                        className="btn btn--primary"
                        disabled={mutations.update.isPending}
                    >
                        {t('action.save')}
                    </button>
                </>
            </>
        </Drawer>
    )
}
