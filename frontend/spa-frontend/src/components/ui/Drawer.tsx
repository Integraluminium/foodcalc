import type { ReactNode } from 'react'
import styles from './Drawer.module.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Right-hand slide-over panel (editors with several sections). */
export function Drawer({ title, onClose, children }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
      </div>
    </div>
  )
}
