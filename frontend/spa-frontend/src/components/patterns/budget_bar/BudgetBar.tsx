import {formatDecimal} from '../../../lib/format.ts'
import styles from './BudgetBar.module.css'

interface Props {
    /** Total cost so far. */
    cost: number
    /** Planned budget; `null` when the event has none. */
    budget: number | null
}

/**
 * Kosten-/Budgetanzeige mit Fortschrittsbalken — eine Quelle für
 * Workspace-Topbar, Übersicht und spätere Kalkulation statt dreifach
 * kopiertem Markup: Text immer, Balken sobald ein Budget > 0 existiert,
 * rote Hervorhebung bei Budgetüberschreitung.
 */
export function BudgetBar({cost, budget}: Props) {
    const over = budget !== null && cost > budget
    const share =
        budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null

    return (
        <>
            <span className={over ? styles.textOver : styles.text}>
                {formatDecimal(cost)} €
                {budget !== null && ` / ${formatDecimal(budget)} €`}
            </span>
            {share !== null && (
                <div className={styles.bar}>
                    <div
                        className={over ? `${styles.fill} ${styles.fillOver}` : styles.fill}
                        style={{width: `${share}%`}}
                    />
                </div>
            )}
        </>
    )
}
