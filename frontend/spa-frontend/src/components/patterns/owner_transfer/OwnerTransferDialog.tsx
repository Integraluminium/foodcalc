import {useState} from 'react'
import {Dialog} from '../dialog/Dialog.tsx'
import {useOwnerTransfer, type OwnerKind} from '../../../hooks/queries/useOwnerTransfer.ts'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import {t} from '../../../i18n'

/**
 * Besitz-Übertragung (UI_Spec Flow B3 / LeABAC): Owner oder Verwalter überträgt
 * die Zugehörigkeit eines Objekts an eine eigene Gruppe — danach gelten die
 * Rollenrechte der Zielgruppe („Alice verliert den Owner-Status; Verwalter der
 * Zielgruppe vergeben die Zugehörigkeit weiter").
 */
export function OwnerTransferDialog({
    kind,
    id,
    currentGroupId,
    onClose,
}: {
    kind: OwnerKind
    id: number
    currentGroupId: number
    onClose: () => void
}) {
    const {data: user} = useCurrentUser()
    const groups = user?.groups ?? []
    const [targetId, setTargetId] = useState<number | ''>('')
    const transfer = useOwnerTransfer()

    const handleTransfer = () => {
        if (typeof targetId !== 'number') return
        transfer.mutate({kind, id, groupId: targetId}, {onSuccess: onClose})
    }

    return (
        <Dialog
            title={t('transfer.title')}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={onClose}
                    >
                        {t('action.cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        disabled={typeof targetId !== 'number' || transfer.isPending}
                        onClick={handleTransfer}
                    >
                        {transfer.isPending ? '…' : t('transfer.confirm')}
                    </button>
                </>
            }
        >
            <p className="muted">{t('transfer.warning')}</p>
            <label className="field">
                {t('transfer.target')}
                <select
                    className="input"
                    value={targetId}
                    onChange={(event) =>
                        setTargetId(
                            event.target.value === '' ? '' : Number(event.target.value),
                        )
                    }
                >
                    <option value="">{t('transfer.chooseGroup')}</option>
                    {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                            {group.is_personal ? ' (persönlich)' : ''}
                            {group.id === currentGroupId
                                ? ` — ${t('transfer.currentOwner')}`
                                : ''}
                        </option>
                    ))}
                </select>
            </label>
        </Dialog>
    )
}
