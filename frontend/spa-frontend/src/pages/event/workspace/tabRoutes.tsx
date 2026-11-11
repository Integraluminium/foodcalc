import { MealPlanTab } from './meals/MealPlanTab.tsx'
import { ShoppingTab } from './shopping/ShoppingTab.tsx'
import { TimelineTab } from './timeline/TimelineTab.tsx'
import { KalkulationTab } from './calculation/KalkulationTab.tsx'
import { useWorkspace } from './workspaceContext.ts'

/**
 * Dünne Routen-Wrapper: beziehen den geteilten Workspace-Kontext
 * (Event-Detail + Mutationen) und rendern die bestehenden Tab-Inhalte.
 * (Der frühere Exporte-Tab ist aufgelöst: Sammel-Exporte → Übersicht,
 * Mahlzeiten-PDF → Speiseplan-Drawer, Touren-Listen → Einkäufe-Tab.)
 */
export function PlanRoute() {
  const { detail } = useWorkspace()
  return <MealPlanTab detail={detail} />
}

export function ShoppingRoute() {
  const { eventId } = useWorkspace()
  return <ShoppingTab eventId={eventId} />
}

export function KalkulationRoute() {
  return <KalkulationTab />
}

export function TimelineRoute() {
  const { detail } = useWorkspace()
  return <TimelineTab meals={detail.meals} />
}
