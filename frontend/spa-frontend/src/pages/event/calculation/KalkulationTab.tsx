import { useWorkspace } from '../workspaceContext.ts'
import {
  useInventoryCoverage,
  useShoppingList,
} from '../../../hooks/queries/useEvents.ts'
import { formatDateRange, formatDecimal, toNumber } from '../../../lib/format.ts'
import { portionCost } from '../../../lib/scaling.ts'
import { t } from '../../../i18n'
import { Spinner } from '../../../molecules/ui/Spinner.tsx'
import styles from '../EventDetailPage.module.css'
import PlaceholderPage from "../../PlaceholderPage.tsx";

/**
 * Kalkulations-Tab (Mockup „Event kalkulation"): alle zur Kostenabschätzung
 * nötigen Zahlen, abgeleitet aus existierenden Daten (Mahlzeiten, Touren,
 * Inventar-Abdeckung) — jeder Wert zeigt seine Herkunft, keine Faktoren.
 */
export function KalkulationTab() {

  // TODO: Implement the KalkulationTab component with actual calculations and data fetching logic.
    return <PlaceholderPage title={"Kalkulation"} phase={"In Arbeit"} hint={"Die Kalkulation wird in einer späteren Phase implementiert."} />
}
