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

/**
 * Kalkulations-Tab (Mockup „Event kalkulation"): alle zur Kostenabschätzung
 * nötigen Zahlen, abgeleitet aus existierenden Daten (Mahlzeiten, Touren,
 * Inventar-Abdeckung) — jeder Wert zeigt seine Herkunft, keine Faktoren.
 */
export function KalkulationTab() {
  const { detail } = useWorkspace()
  const shopping = useShoppingList(detail.event.id)
  const coverage = useInventoryCoverage(detail.event.id)

  const cost = toNumber(detail.total_cost) ?? 0
  const budget = toNumber(detail.event.budget)
  const share =
    budget !== null && budget > 0 ? Math.min((cost / budget) * 100, 100) : null
  const over = budget !== null && cost > budget

  const portions = detail.meals.reduce((sum, meal) => sum + meal.servings, 0)
  const weight = detail.meals.reduce(
    (sum, meal) => sum + (toNumber(meal.weight) ?? 0),
    0,
  )
  // Pro Mahlzeit ist eine Portion pro Person geplant: die Summe der
  // kJ/Portion-Werte ist der Energiebedarf pro Person über den Zeitraum.
  const energyPerPerson = detail.meals.reduce(
    (sum, meal) => sum + (toNumber(meal.energy_per_serving) ?? 0),
    0,
  )
  const costPerPerson = portions > 0 ? cost / portions : null

  const tours = shopping.data?.tours ?? []
  const unassigned = shopping.data?.without_tour.length ?? 0
  const unassignedWeight = (shopping.data?.without_tour ?? []).reduce(
    (sum, item) => sum + (toNumber(item.weight) ?? 0),
    0,
  )
  const tourCost = tours.reduce(
    (sum, tour) => sum + (toNumber(tour.total_price) ?? 0),
    0,
  )

  const coverageRows = coverage.data ?? []
  const demand = coverageRows.reduce(
    (sum, row) => sum + (toNumber(row.demand_kg) ?? 0),
    0,
  )
  const covered = coverageRows.reduce(
    (sum, row) =>
      sum +
      Math.min(
        toNumber(row.covered_kg) ?? 0,
        toNumber(row.demand_kg) ?? 0,
      ),
    0,
  )
  const coverageShare =
    demand > 0 ? Math.min((covered / demand) * 100, 100) : null

  return (
    <div className={styles.tabSection}>
      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('calc.heading')}</h3>
          <span className="muted">
            {t('calc.hint')}
          </span>
        </div>
        <dl className={styles.facts}>
          <dt>{t('overview.period')}</dt>
          <dd>
            {formatDateRange(
              detail.meals[0]?.start_time ?? null,
              detail.meals[detail.meals.length - 1]?.start_time ?? null,
            )}
          </dd>
          <dt>{t('calc.costTotal')}</dt>
          <dd>
            <span className={over ? styles.over : ''}>
              {formatDecimal(cost)} €
              {budget !== null && ` / ${formatDecimal(budget)} €`}
            </span>
            {share !== null && (
              <div className={styles.budgetBar}>
                <div
                  className={`${styles.budgetFill} ${over ? styles.budgetOver : ''}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            )}
          </dd>
          <dt>{t('calc.costPerPerson')}</dt>
          <dd>
            {costPerPerson !== null ? `${formatDecimal(costPerPerson)} €` : '–'}
            <span className="muted"> bei {portions} Portionen</span>
          </dd>
          <dt>{t('calc.energyPerPerson')}</dt>
          <dd>
            {energyPerPerson > 0
              ? `${formatDecimal(energyPerPerson, 0)} kJ`
              : '–'}
            <span className="muted">
              {' '}
              {t('calc.energyPerPersonHint')}
            </span>
          </dd>
          <dt>{t('overview.cookingAmount')}</dt>
          <dd>{formatDecimal(weight)} kg</dd>
        </dl>
      </div>

      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('calc.costPerMeal')}</h3>
        </div>
        {detail.meals.length === 0 ? (
          <p className="muted">t('plan.empty')</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('calc.col.meal')}</th>
                <th className="num">{t('calc.col.servings')}</th>
                <th className="num">{t('plan.col.weight')}</th>
                <th className="num">{t('plan.col.cost')}</th>
                <th className="num">{t('plan.col.costPerPortion')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.meals.map((meal) => (
                <tr key={meal.meal_id}>
                  <td>{meal.name}</td>
                  <td className="num">{meal.servings}</td>
                  <td className="num">{formatDecimal(meal.weight)} kg</td>
                  <td className="num">{formatDecimal(meal.price)} €</td>
                  <td className="num">
                    {formatDecimal(portionCost(meal.price, meal.servings))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('calc.costPerTour')}</h3>
          {shopping.isPending && <Spinner size="sm" />}
        </div>
        {!shopping.isPending && tours.length === 0 && unassigned === 0 ? (
          <p className="muted">t('calc.noShopping')</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('calc.col.tour')}</th>
                <th className="num">{t('calc.col.positions')}</th>
                <th className="num">{t('calc.col.total')}</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => (
                <tr key={tour.id}>
                  <td>
                    {tour.store_name ?? `Tour ${tour.id}`}
                    <span className="muted">
                      {' '}
                      · {tour.tour_date.slice(0, 10)}
                    </span>
                  </td>
                  <td className="num">{tour.items.length}</td>
                  <td className="num">
                    {tour.total_price !== null
                      ? `${formatDecimal(tour.total_price)} €`
                      : t('calc.noPrices')}
                  </td>
                </tr>
              ))}
              {unassigned > 0 && (
                <tr>
                  <td>
                    t('calc.unassigned')
                    <span className="muted">
                      {' '}
                      · {formatDecimal(unassignedWeight)} kg
                    </span>
                  </td>
                  <td className="num">{unassigned}</td>
                  <td className="num muted">–</td>
                </tr>
              )}
              {tours.length > 0 && (
                <tr>
                  <td>
                    <strong>{t('calc.tourSum')}</strong>
                  </td>
                  <td />
                  <td className="num">
                    <strong>{formatDecimal(tourCost)} €</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className={`card ${styles.dayCard}`}>
        <div className={styles.dayHeader}>
          <h3 className="section-subtitle">{t('calc.coverage')}</h3>
          {coverage.isPending && <Spinner size="sm" />}
        </div>
        {coverageShare === null ? (
          <p className="muted">
            t('calc.noDemand')
          </p>
        ) : (
          <dl className={styles.facts}>
            <dt>{t('calc.covered')}</dt>
            <dd>
              {formatDecimal(coverageShare, 0)} %
              <div className={styles.budgetBar}>
                <div
                  className={styles.budgetFill}
                  style={{ width: `${coverageShare}%` }}
                />
              </div>
            </dd>
            <dt>{t('calc.demand')}</dt>
            <dd>{formatDecimal(demand)} kg</dd>
            <dt>{t('calc.fromStock')}</dt>
            <dd>{formatDecimal(covered)} kg</dd>
            <dt>{t('calc.toBuy')}</dt>
            <dd>{formatDecimal(Math.max(demand - covered, 0))} kg</dd>
          </dl>
        )}
      </div>
    </div>
  )
}
