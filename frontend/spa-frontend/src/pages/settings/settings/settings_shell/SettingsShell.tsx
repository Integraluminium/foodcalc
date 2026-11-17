import type {LucideIcon} from 'lucide-react'
import type {ReactNode} from 'react'
import styles from './SettingsShell.module.css'

export interface SettingsNavItem {
  id: string
  label: string
  icon: LucideIcon
  groupLabel?: string
}

export function SettingsShell({
                                title,
                                subtitle,
                                headerActions,
                                items,
                                activeId,
                                onSelect,
                                children,
                              }: {
  title: string
  subtitle?: string
  headerActions?: ReactNode
  items: SettingsNavItem[]
  activeId: string
  onSelect: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="secondary">{subtitle}</p>}
        </div>
        {headerActions}
      </header>

      <div className={styles.body}>
        <nav className={styles.nav} aria-label={title}>
          {items.map((item, idx) => {
            const Icon = item.icon
            const showGroupHeader =
              item.groupLabel &&
              (idx === 0 || items[idx - 1]?.groupLabel !== item.groupLabel)
            return (
              <div key={item.id} style={{ display: 'contents' }}>
                {showGroupHeader && (
                  <span className={styles.navGroupLabel}>{item.groupLabel}</span>
                )}
                <button
                  type="button"
                  className={`${styles.navItem} ${
                    activeId === item.id ? styles.navItemActive : ''
                  }`}
                  onClick={() => onSelect(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              </div>
            )
          })}
        </nav>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}