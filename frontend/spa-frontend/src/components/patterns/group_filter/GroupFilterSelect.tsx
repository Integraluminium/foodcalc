import {t} from "i18next";
import type {Group} from '../../../api'

interface Props {
    /** Groups the session user belongs to. */
    groups: readonly Group[]
    value: number | 'all'
    onChange: (filter: number | 'all') => void
}

export function GroupFilterSelect({groups, value, onChange}: Props) {
    return (
        <select
            className="input"
            value={value === 'all' ? 'all' : String(value)}
            onChange={(event) => {
                const raw = event.target.value
                onChange(raw === 'all' ? 'all' : Number(raw))
            }}
            aria-label={t('common:filter.byOwner')}
        >
            <option value="all">{t('common:filter.allGroups')}</option>
            {groups.map((group) => (
                <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ' (persönlich)' : ''}
                </option>
            ))}
        </select>
    )
}
