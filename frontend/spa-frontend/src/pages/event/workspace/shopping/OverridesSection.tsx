import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ingredientsApi } from '../../../../api'
import { Spinner } from '../../../../components/ui/spinner/Spinner.tsx'
import { Skeleton } from '../../../../components/ui/skeleton/Skeleton.tsx'
import {
  useEventMutations,
  useEventOverrides,
  useShoppingList,
} from '../../../../hooks/queries/useEvents.ts'
import { useStores } from '../../../../hooks/queries/useMasterData.ts'
import { formatDecimal, toNumber } from '../../../../lib/format.ts'
import { t } from '../../../../i18n'
import styles from '../EventDetailPage.module.css'

/**
 * Source overrides: per ingredient, a specific source is pinned for this
 * event (e.g. another store, a private source). Candidates come from the
 * event's shopping list; sources load on demand per ingredient.
 */
export function OverridesSection({ eventId }: { eventId: number }) {
  const shopping = useShoppingList(eventId)
  const overrides = useEventOverrides(eventId)
  const mutations = useEventMutations(eventId)
  const stores = useStores()
  const [ingredientId, setIngredientId] = useState(0)

  // Ingredient candidates: everything on the shopping list (deduped).
  const candidates = (() => {
    const seen = new Map<number, string>()
    if (shopping.data) {
      for (const tour of shopping.data.tours) {
        for (const item of tour.items) {
          seen.set(item.ingredient_id, item.ingredient_name)
        }
      }
      for (const item of shopping.data.without_tour) {
        seen.set(item.ingredient_id, item.ingredient_name)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  })()

  const sources = useQuery({
    queryKey: ['ingredients', 'detail', ingredientId] as const,
    queryFn: () => ingredientsApi.detail(ingredientId),
    enabled: ingredientId > 0,
  })

  const overriddenSourceIds = new Set(
    (overrides.data ?? []).map((override) => override.source_id),
  )

  const storeName = (storeId: number) =>
    stores.data?.find((store) => store.id === storeId)?.name ??
    t('overrides.storeFallback', { id: storeId })

  return (
    <div className={`card ${styles.dayCard}`}>
      <div className={styles.dayHeader}>
        <h3 className="section-subtitle">{t('overrides.heading')}</h3>
        <span className="muted">{t('overrides.hint')}</span>
      </div>

      <div className={styles.tabToolbar}>
        <select
          className="input"
          value={ingredientId || ''}
          onChange={(event) => setIngredientId(Number(event.target.value) || 0)}
        >
          <option value="">{t('overrides.chooseIngredient')}</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
        {ingredientId > 0 &&
          (sources.isPending ? (
            <Spinner size="sm" />
          ) : (
            <select
              className="input"
              value=""
              onChange={(event) => {
                const sourceId = Number(event.target.value)
                if (sourceId) {
                  mutations.addOverride.mutate(sourceId)
                }
              }}
            >
              <option value="">{t('overrides.chooseSource')}</option>
              {(sources.data?.sources ?? [])
                .filter((source) => !overriddenSourceIds.has(source.id))
                .map((source) => (
                  <option key={source.id} value={source.id}>
                    {storeName(source.store_id)} ·{' '}
                    {formatDecimal(toNumber(source.package_size) ?? 0)} kg ·{' '}
                    {formatDecimal(toNumber(source.price) ?? 0)} €
                  </option>
                ))}
            </select>
          ))}
      </div>

      {overrides.isPending ? (
        <div className={styles.previewSkeleton}>
          <Skeleton height="0.8rem" />
          <Skeleton width="70%" height="0.8rem" />
        </div>
      ) : (overrides.data ?? []).length === 0 ? (
        <p className="muted">{t('overrides.none')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('overrides.col.ingredient')}</th>
              <th>{t('overrides.col.source')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(overrides.data ?? []).map((override) => (
              <tr key={override.source_id}>
                <td>{override.ingredient_name}</td>
                <td>
                  {override.store_name ??
                    t('overrides.storeFallback', { id: override.store_id })}
                </td>
                <td className="num">
                  <button
                    type="button"
                    className={styles.iconButton}
                    title={t('overrides.remove')}
                    onClick={() => mutations.removeOverride.mutate(override.source_id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
