import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
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

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
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
            <div className={styles.userLinks}>
              <NavLink to="/account" className={styles.userLink}>
                Konto
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
