import { useEffect, useState } from 'react'
import { subscribeToasts } from './toast.ts'
import type { ToastItem } from './toast.ts'
import styles from './Toast.module.css'

/** Toast-Stapel unten rechts (Download-Feedback, Validierungen, Fehler). */
export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setItems), [])

  if (items.length === 0) return null

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.kind]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
