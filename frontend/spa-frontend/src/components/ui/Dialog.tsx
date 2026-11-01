import type { ReactNode } from 'react'
import styles from './Dialog.module.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Centered modal dialog (forms, confirmations). */
export function Dialog({ title, onClose, children, footer }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.dialog} card`}
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
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
