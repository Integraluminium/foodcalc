import styles from './PlaceholderPage.module.css'

type Props = {
  title: string
  /** Implementation phase that will deliver this view. */
  phase: string
  hint?: string
}

/** Temporary stub shown for routes whose screens come in later phases. */
export default function PlaceholderPage({ title, phase, hint }: Props) {
  return (
    <div className={styles.wrap}>
      <h1 className="section-title">{title}</h1>
      <div className={`card ${styles.card}`}>
        <p className={styles.emoji}>🚧</p>
        <p className="secondary">
          Diese Ansicht wird in <strong>{phase}</strong> implementiert.
        </p>
        {hint && <p className="muted">{hint}</p>}
      </div>
    </div>
  )
}
