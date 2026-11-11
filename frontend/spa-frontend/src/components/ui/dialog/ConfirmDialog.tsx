import { Dialog } from './Dialog.tsx'
import { Spinner } from '../spinner/Spinner.tsx'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Destructive action confirmation. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Löschen',
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Spinner size="sm" /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="secondary">{message}</p>
    </Dialog>
  )
}
