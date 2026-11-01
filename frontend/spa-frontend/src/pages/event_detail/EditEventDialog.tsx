import type { FormEvent } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { useEventMutations } from '../../hooks/queries/useEvents'
import type { Event } from '../../api/types'

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
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Event bearbeiten"
      onClose={onClose}
      footer={
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
            Speichern
          </button>
        </>
      }
    >
      <form id="edit-event-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input
              className="input"
              name="name"
              defaultValue={event.name}
              required
            />
          </label>
          <label className="field">
            Budget (€)
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
            Kommentar
            <input
              className="input"
              name="comment"
              defaultValue={event.comment ?? ''}
            />
          </label>
        </div>
      </form>
    </Dialog>
  )
}
