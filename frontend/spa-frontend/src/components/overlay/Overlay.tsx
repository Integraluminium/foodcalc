import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import styles from './Overlay.module.css'

export type OverlayVariant = 'drawer' | 'modal'
export type OverlaySize = 'sm' | 'md' | 'lg'

const MAX_WIDTHS: Record<OverlaySize, string> = {
  sm: '420px',
  md: '560px',
  lg: '880px',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface OverlayProps {
  title: string
  onClose: () => void
  /** `drawer` = Slide-over rechts (Inspektion), `modal` = zentrierter Dialog. */
  variant?: OverlayVariant
  size?: OverlaySize
  footer?: ReactNode
  children: ReactNode
}

/**
 * Einheitliches Overlay-Primitive für alle Dialog-/Drawer-Verwendungen:
 * Backdrop, ESC zum Schließen, Fokus-Falle (Tab zirkuliert im Panel) und
 * Body-Scroll-Lock an genau einer Stelle statt pro Komponente.
 */
export function Overlay({
  title,
  onClose,
  variant = 'modal',
  size = 'md',
  footer,
  children,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    focusables[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      className={`${styles.overlay} ${variant === 'drawer' ? styles.drawer : styles.modal}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${styles.panel} ${variant === 'drawer' ? styles.panelDrawer : styles.panelModal}`}
        style={{ '--overlay-max-width': MAX_WIDTHS[size] } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
