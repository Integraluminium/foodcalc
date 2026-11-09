import { NavLink, Outlet } from 'react-router-dom'
import type { ChangeEvent } from 'react'
import { useActiveGroup } from '../../hooks/useActiveGroup'
import { t } from '../../i18n'
import {
  BoxIcon,
  BrandIcon,
  CalendarIcon,
  IngredientsIcon,
  RecipeIcon,
} from './icons'
import { UserMenu } from './UserMenu'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { to: '/ingredients', labelKey: 'nav.ingredients', Icon: IngredientsIcon },
  { to: '/recipes', labelKey: 'nav.recipes', Icon: RecipeIcon },
  { to: '/events', labelKey: 'nav.events', Icon: CalendarIcon },
  { to: '/inventories', labelKey: 'nav.inventories', Icon: BoxIcon },
] as const

export default function AppShell() {
  const { groups, activeGroupId, setActiveGroupId } = useActiveGroup()

  const handleGroupChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const raw = event.target.value
    setActiveGroupId(raw === '' ? null : Number(raw))
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <BrandIcon size={18} />
          </span>
          <span className={styles.brandName}>Foodcalc</span>
        </div>
        <nav className={styles.nav} aria-label="Hauptnavigation">
          {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
            >
              <Icon size={18} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.footer}>
          <label className={styles.groupBlock}>
            <span className={styles.groupLabel}>{t('shell.activeGroup')}</span>
            <select
              className={styles.groupSelect}
              value={activeGroupId ?? ''}
              onChange={handleGroupChange}
              aria-label={t('shell.activeGroup')}
              title={t('shell.activeGroupHint')}
              disabled={groups.length === 0}
            >
              {activeGroupId === null && <option value="" disabled />}
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {group.is_personal ? ' (persönlich)' : ''}
                </option>
              ))}
            </select>
          </label>
          <UserMenu />
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
