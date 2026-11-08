import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { ChangeEvent } from 'react'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
import { useActiveGroup } from '../../hooks/useActiveGroup'
import {
  BoxIcon,
  BrandIcon,
  CalendarIcon,
  IngredientsIcon,
  LogoutIcon,
  RecipeIcon,
} from './icons'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { to: '/ingredients', label: 'Ingredients', Icon: IngredientsIcon },
  { to: '/recipes', label: 'Recipes', Icon: RecipeIcon },
  { to: '/events', label: 'Events', Icon: CalendarIcon },
  { to: '/inventories', label: 'Inventories', Icon: BoxIcon },
]

export default function AppShell() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { groups, activeGroupId, setActiveGroupId } = useActiveGroup()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

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
          {NAV_ITEMS.map(({ to, label, Icon }) => (
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
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.footer}>
          <div className={styles.userArea}>
            <span className={styles.userName}>{user?.username ?? '…'}</span>
            <label className={styles.groupSelectWrap}>
              <span className={styles.groupSelectLabel}>Gruppe</span>
              <select
                className={styles.groupSelect}
                value={activeGroupId ?? ''}
                onChange={handleGroupChange}
                aria-label="Aktive Gruppe wählen"
                title="Aktive Gruppe — steuert Besitz und Sichtbarkeit"
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
            <div className={styles.userLinks}>
              <NavLink to="/settings" className={styles.userLink}>
                Einstellungen
              </NavLink>
              {user?.is_admin && (
                <NavLink to="/admin" className={styles.userLink}>
                  Verwaltung
                </NavLink>
              )}
            </div>
          </div>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Abmelden"
            aria-label="Abmelden"
            disabled={logout.isPending}
          >
            <LogoutIcon size={18} />
          </button>
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
