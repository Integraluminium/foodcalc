import {t} from "i18next";
import {useState} from 'react'
import {type OwnerKind, useOwnerTransfer} from '../../../hooks/queries/useOwnerTransfer.ts'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import {Dialog} from '../dialog/Dialog.tsx'

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
            title={t('common:transfer.title')}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={onClose}
                    >
                        {t('common:actions.cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        disabled={typeof targetId !== 'number' || transfer.isPending}
                        onClick={handleTransfer}
                    >
                        {transfer.isPending ? '…' :t('common:transfer.confirm')}
                    </button>
                </>
            }
        >
            <p className="muted">{t('common:transfer.warning')}</p>
            <label className="field">
                {t('common:transfer.target')}
                <select
                    className="input"
                    value={targetId}
                    onChange={(event) =>
                        setTargetId(
                            event.target.value === '' ? '' : Number(event.target.value),
                        )
                    }
                >
                    <option value="">{t('common:transfer.chooseGroup')}</option>
                    {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                            {group.is_personal ? ' (persönlich)' : ''}
                            {group.id === currentGroupId
                                ? ` — ${t('common:transfer.currentOwner')}`
                                : ''}
                        </option>
                    ))}
                </select>
            </label>
        </Dialog>
    )
}
