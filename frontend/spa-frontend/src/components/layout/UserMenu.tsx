import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
import { t } from '../../i18n'
import styles from './UserMenu.module.css'

/**
 * Sidebar-Fußzeile: nur Name/Avatar des aktiven Nutzers sichtbar, das Menü
 * (Profil, Verwaltung, Abmelden) öffnet sich per Klick — selten genutzte
 * Aktionen stören nicht den Blick. Der Gruppen-Switcher bleibt bewusst als
 * eigener Block darüber (steuert Besitz/Sichtbarkeit, häufig genutzt).
 *
 * `compact` (Event-Workspace): nur der Avatar, Sidebar ist dann Icon-Rail.
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  const initial = (user?.username ?? '?').charAt(0).toUpperCase()

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={compact ? `${styles.trigger} ${styles.compact}` : styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('shell.userMenu')}
      >
        <span className={styles.avatar}>{initial}</span>
        {!compact && (
          <>
            <span className={styles.name}>{user?.username ?? '…'}</span>
            <span className={styles.chevron} aria-hidden="true">
              ▾
            </span>
          </>
        )}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false)
              void navigate('/settings')
            }}
          >
            {t('shell.profileSettings')}
          </button>
          {user?.is_admin && (
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                setOpen(false)
                void navigate('/admin')
              }}
            >
              {t('shell.admin')}
            </button>
          )}
          <div className={styles.separator} />
          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.danger}`}
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {t('shell.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
