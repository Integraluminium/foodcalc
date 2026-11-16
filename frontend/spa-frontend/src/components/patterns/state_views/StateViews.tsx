import {t} from "i18next";
import type {ReactNode} from 'react'
import {SkeletonTable} from "../../patterns/skeleton/Skeleton.tsx";
import styles from './StateViews.module.css'


/** Consistent loading / error / empty states for hub lists and sections. */

export function LoadingState() {
  return (
    <div className={styles.state}>
      <SkeletonTable rows={5} cols={4} />
      <span className={styles.visuallyHidden}>{t('common:state.loading')}</span>
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className={styles.state}>
      <p className="secondary">{message ??t('common:state.error')}</p>
    </div>
  )
}

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div className={styles.state}>
      <p className="muted">{message}</p>
      {action}
    </div>
  )
}
