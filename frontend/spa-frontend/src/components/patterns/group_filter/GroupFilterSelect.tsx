import type {Group} from '../../../api/types.ts'
import {t} from '../../../i18n'

interface Props {
    /** Groups the session user belongs to. */
    groups: readonly Group[]
    value: number | 'all'
    onChange: (filter: number | 'all') => void
}

/**
 * Geteilter Besitzer-Filter aller Hub-Listen (UI_Spec §3.2); der Zustand
 * lebt in `useOwnerFilter()` — „Alle Gruppen“ überschreibt die
 * Sidebar-Auswahl für die Session.
 */
export function GroupFilterSelect({groups, value, onChange}: Props) {
    return (
        <select
            className="input"
            value={value === 'all' ? 'all' : String(value)}
            onChange={(event) => {
                const raw = event.target.value
                onChange(raw === 'all' ? 'all' : Number(raw))
            }}
            aria-label={t('filter.byOwner')}
        >
            <option value="all">{t('filter.allGroups')}</option>
            {groups.map((group) => (
                <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ' (persönlich)' : ''}
                </option>
            ))}
        </select>
    )
}
