// src/pages/event/workspace/shopping/OverridesSection.tsx
import {useQuery} from '@tanstack/react-query'
import {Trash2} from 'lucide-react'
import {useState} from 'react'
import {ingredientsApi} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Skeleton} from '../../../../components/patterns/skeleton/Skeleton.tsx'
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {useEventMutations, useEventOverrides, useShoppingList,} from '../../../../hooks/queries/useEvents.ts'
import {useStores} from '../../../../hooks/queries/useMasterData.ts'
import {t} from '../../../../i18n'
import {formatDecimal, toNumber} from '../../../../lib/format.ts'

export function OverridesSection({ eventId }: { eventId: number }) {
  const shopping = useShoppingList(eventId)
  const overrides = useEventOverrides(eventId)
  const mutations = useEventMutations(eventId)
  const stores = useStores()
  const [ingredientId, setIngredientId] = useState(0)

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
    (overrides.data ?? []).map((o) => o.source_id),
  )

  const storeName = (storeId: number) =>
    stores.data?.find((s) => s.id === storeId)?.name ??
    t('overrides.storeFallback', { id: storeId })

  return (
    <CardSection title={t('overrides.heading')} subtitle={t('overrides.hint')}>
      <div className="tab-toolbar" style={{ marginBottom: 'var(--space-3)' }}>
        <select
          className="input"
          value={ingredientId || ''}
          onChange={(e) => setIngredientId(Number(e.target.value) || 0)}
        >
          <option value="">{t('overrides.chooseIngredient')}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
              onChange={(e) => {
                const sourceId = Number(e.target.value)
                if (sourceId) mutations.addOverride.mutate(sourceId)
              }}
            >
              <option value="">{t('overrides.chooseSource')}</option>
              {(sources.data?.sources ?? [])
                .filter((s) => !overriddenSourceIds.has(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {storeName(s.store_id)} ·{' '}
                    {formatDecimal(toNumber(s.package_size) ?? 0)} kg ·{' '}
                    {formatDecimal(toNumber(s.price) ?? 0)} €
                  </option>
                ))}
            </select>
          ))}
      </div>

      {overrides.isPending ? (
        <div className="form-stack">
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
                  className="icon-btn icon-btn--danger"
                  title={t('overrides.remove')}
                  onClick={() =>
                    mutations.removeOverride.mutate(override.source_id)
                  }
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </CardSection>
  )
}