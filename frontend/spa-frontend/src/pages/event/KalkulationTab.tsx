import { useWorkspace } from './workspaceContext'
import {
  useInventoryCoverage,
  useShoppingList,
} from '../../hooks/queries/useEvents'
import { formatDateRange, formatDecimal, toNumber } from '../../lib/format'
import { portionCost } from '../../lib/scaling'
import { t } from '../../i18n'
import { Spinner } from '../../components/ui/Spinner'
import styles from '../EventDetailPage.module.css'
import PlaceholderPage from "../PlaceholderPage.tsx";

/**
 * Kalkulations-Tab (Mockup „Event kalkulation"): alle zur Kostenabschätzung
 * nötigen Zahlen, abgeleitet aus existierenden Daten (Mahlzeiten, Touren,
 * Inventar-Abdeckung) — jeder Wert zeigt seine Herkunft, keine Faktoren.
 */
export function KalkulationTab() {

  // TODO: Implement the KalkulationTab component with actual calculations and data fetching logic.
    return <PlaceholderPage title={"Kalkulation"} phase={"In Arbeit"} hint={"Die Kalkulation wird in einer späteren Phase implementiert."} />
}
