import type {ChangeEvent} from 'react'
import {useState} from 'react'
import {NavLink, Outlet, useLocation} from 'react-router-dom'
import {useActiveGroup} from '../../../hooks/useActiveGroup.ts'
import {t} from '../../../i18n'
import {BoxIcon, BrandIcon, CalendarIcon, IngredientsIcon, RecipeIcon,} from '../../ui/icons/icons.tsx'
import {UserMenu} from '../user_menu/UserMenu.tsx'
import {Toasts} from '../../ui/toast/Toast.tsx'
import styles from './AppShell.module.css'

const COLLAPSE_KEY = 'foodcalc.sidebarCollapsed'

function readStoredCollapse(): boolean | null {
    try {
        const raw = localStorage.getItem(COLLAPSE_KEY)
        return raw === '1' ? true : raw === '0' ? false : null
    } catch {
        return null
    }
}

const NAV_ITEMS = [
    {to: '/ingredients', labelKey: 'nav.ingredients', Icon: IngredientsIcon},
    {to: '/recipes', labelKey: 'nav.recipes', Icon: RecipeIcon},
    {to: '/events', labelKey: 'nav.events', Icon: CalendarIcon},
    {to: '/inventories', labelKey: 'nav.inventories', Icon: BoxIcon},
    {to: '/static/documents', labelKey: 'nav.documents', Icon: BoxIcon},
] as const

export default function AppShell() {
    const location = useLocation()
    const {groups, activeGroupId, setActiveGroupId} = useActiveGroup()

    // Einklappen manuell (Pfeil-Button, persistiert) oder automatisch im
    // Event-Workspace — die manuelle Wahl überschreibt den Workspace-Default.
    const [collapseOverride, setCollapseOverride] = useState<boolean | null>(
        readStoredCollapse,
    )
    const inWorkspace = /^\/events\/\d+(\/|$)/.test(location.pathname)
    const collapsed = collapseOverride ?? inWorkspace

    const toggleCollapsed = () => {
        const next = !collapsed
        setCollapseOverride(next)
        try {
            localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
        } catch {
            // Storage unavailable — Auswahl lebt nur in state.
        }
    }

    const handleGroupChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const raw = event.target.value
        setActiveGroupId(raw === '' ? null : Number(raw))
    }

    return (
        <div className={`${styles.shell} ${collapsed ? styles.workspace : ''}`}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
          <span className={styles.brandMark}>
            <BrandIcon size={18}/>
          </span>
                    <span className={styles.brandName}>Foodcalc</span>
                    <button
                        type="button"
                        className={styles.collapseBtn}
                        onClick={toggleCollapsed}
                        aria-label={
                            collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'
                        }
                        title={
                            collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'
                        }
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>
                <nav className={styles.nav} aria-label="Hauptnavigation">
                    {NAV_ITEMS.map(({to, labelKey, Icon}) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({isActive}) =>
                                isActive
                                    ? `${styles.navItem} ${styles.navItemActive}`
                                    : styles.navItem
                            }
                        >
                            <Icon size={18}/>
                            <span>{t(labelKey)}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className={styles.footer}>
                    <UserMenu compact={collapsed}/>
                </div>
            </aside>
            <main className={styles.content}>
                <Outlet/>
                <Toasts/>
            </main>
        </div>
    )
}
