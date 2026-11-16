import type {ReactNode} from 'react'
import {SegmentedControl, type SegmentOption} from '../../ui/segmented_control/SegmentedControl.tsx'
import styles from './WorkspaceLayout.module.css'

export interface WorkspaceLayoutProps<T extends string> {
  title: string
  /** Badges & muted comment displayed under the title */
  meta?: ReactNode
  /** Optional right-side header actions (e.g., Edit / Delete buttons) */
  actions?: ReactNode
  /** Optional secondary bar inside the top card (e.g., BudgetBar) */
  summaryRow?: ReactNode

  tabs?: SegmentOption<T>[]
  activeTab?: T
  onTabChange?: (tab: T) => void
  tabsAriaLabel?: string

  children: ReactNode
}

export function WorkspaceLayout<T extends string>({
                                                    title,
                                                    meta,
                                                    actions,
                                                    summaryRow,
                                                    tabs,
                                                    activeTab,
                                                    onTabChange,
                                                    tabsAriaLabel,
                                                    children,
                                                  }: WorkspaceLayoutProps<T>) {
  return (
    <div className={styles.workspace}>
      <div className={`card ${styles.topbar}`}>
        <div className={styles.topbarHeader}>
          <div className={styles.topbarMain}>
            <h1 className="section-title">{title}</h1>
            {meta && <div className={styles.badges}>{meta}</div>}
          </div>
          {actions && <div>{actions}</div>}
        </div>

        {summaryRow && <div className={styles.extraRow}>{summaryRow}</div>}
      </div>

      {tabs && activeTab !== undefined && onTabChange && (
        <SegmentedControl
          options={tabs}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel={tabsAriaLabel}
        />
      )}

      {children}
    </div>
  )
}