import {X} from 'lucide-react'
import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {RoleDefinition} from '../../../api'
import {Badge} from '../../ui/badge/Badge.tsx'
import {roleLabel} from '../../../lib/roles.ts'
import styles from './RoleMultiSelect.module.css'

export interface RoleMultiSelectProps {
  /** The backend role catalog (`GET /api/roles`). */
  roles: RoleDefinition[] | undefined
  value: string[]
  onChange?: (nextRoles: string[]) => void
  /** Read-only pills when omitted or true. */
  disabled?: boolean
  /** Slugs that cannot be unchecked (e.g. the last `manager`). */
  lockedRoles?: string[]
  lockedReason?: string
  /** Rendered when the member has no role at all. */
  emptyLabel?: string
}

/**
 * Multi-role picker rendered purely from the backend role catalog:
 * pills for assigned roles plus a popover checklist. Read-only mode shows
 * the pills without any trigger.
 */
export function RoleMultiSelect({
  roles,
  value,
  onChange,
  disabled,
  lockedRoles = [],
  lockedReason,
  emptyLabel,
}: RoleMultiSelectProps) {
  const {t} = useTranslation(['common', 'settings'])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const editable = !disabled && typeof onChange === 'function'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (slug: string) => {
    if (!onChange) return
    if (value.includes(slug)) {
      if (lockedRoles.includes(slug)) return
      onChange(value.filter((role) => role !== slug))
    } else {
      onChange([...value, slug])
    }
  }

  const basics = (roles ?? []).filter((role) => role.category === 'basic')
  const domains = (roles ?? []).filter((role) => role.category === 'domain')
  const groupsToRender: [string, RoleDefinition[]][] = [
    ['basic', basics],
    ['domain', domains],
  ]

  return (
    <div className={styles.pills}>
      {value.length === 0 && emptyLabel && (
        <Badge variant="neutral">{emptyLabel}</Badge>
      )}
      {value.map((slug) => {
        const locked = lockedRoles.includes(slug)
        const definition = roles?.find((role) => role.slug === slug)
        return (
          <Badge
            key={slug}
            variant="neutral"
            title={locked ? lockedReason : definition?.description}
            className={locked ? styles.pillLocked : undefined}
          >
            {roleLabel(slug, t, roles)}
            {editable && !locked && (
              <button
                type="button"
                className={styles.remove}
                aria-label={t('settings:rights.removeRole', 'Rolle entfernen')}
                onClick={() => onChange?.(value.filter((role) => role !== slug))}
              >
                <X size={11} />
              </button>
            )}
          </Badge>
        )
      })}

      {editable && (
        <div className={styles.wrapper} ref={wrapperRef}>
          <button
            type="button"
            className={styles.trigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            title={t('settings:rights.addRole', 'Rolle hinzufügen')}
            onClick={() => setOpen((prev) => !prev)}
          >
            +
          </button>
          {open && (
            <div className={styles.popover} role="listbox">
              {groupsToRender.map(([category, list]) =>
                list.length > 0 && (
                    <div key={category}>
                      <p className={styles.groupLabel}>
                        {t(`settings:rights.category.${category}`)}
                      </p>
                      {list.map((role) => (
                        <label key={role.slug} className={styles.option}>
                          <input
                            type="checkbox"
                            checked={value.includes(role.slug)}
                            onChange={() => toggle(role.slug)}
                          />
                          <span>
                            <span className={styles.optionLabel}>
                              {roleLabel(role.slug, t, roles)}
                            </span>
                            <span className={styles.optionHint}>
                              {role.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
