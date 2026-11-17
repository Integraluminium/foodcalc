import {ExternalLink, Pencil, Plus, Trash2} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {IngredientDetail, IngredientSource} from '../../../api/types.ts'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {notify} from '../../../components/ui/toast/toast.ts'
import {useIngredient, useIngredientMutations,} from '../../../hooks/queries/useIngredients.ts'
import {useStores, useUnits} from '../../../hooks/queries/useMasterData.ts'
import {formatDecimal, toNumber} from '../../../lib/format.ts'
import styles from './IngredientDrawers.module.css'

export function IngredientSourcesDrawer({
                                          ingredientId,
                                          onClose,
                                        }: {
  ingredientId: number
  onClose: () => void
}) {
  const { t } = useTranslation([])
  const detail = useIngredient(ingredientId)
  const stores = useStores()
  const units = useUnits()

  return (
    <Drawer title={t('ingredients:detail.sourcesDrawerTitle')} onClose={onClose}>
      {detail.data ? (
        <SourcesEditor
          detail={detail.data}
          stores={stores.data ?? []}
          units={units.data ?? []}
        />
      ) : detail.isError ? (
        <p className="secondary">{String(detail.error)}</p>
      ) : (
        <Spinner />
      )}
    </Drawer>
  )
}

export function SourcesEditor({
                                detail,
                                stores,
                                units,
                              }: {
  detail: IngredientDetail
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
}) {
  const { t } = useTranslation([])
  const mutations = useIngredientMutations(detail.ingredient.id)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  if (stores.length === 0) {
    return <p className="secondary">{t('ingredients:detail.noStores')}</p>
  }

  return (
    <div className={styles.drawerBody}>
      {detail.sources.length === 0 && (
        <p className="muted">{t('ingredients:detail.sourcesEmpty')}</p>
      )}

      {detail.sources.length > 0 && (
        <div className={styles.sourceList}>
          {detail.sources.map((source) =>
            editingId === source.id ? (
              <SourceForm
                key={source.id}
                initial={source}
                stores={stores}
                units={units}
                onCancel={() => setEditingId(null)}
                onSubmit={(input) =>
                  mutations.updateSource.mutate(
                    { sourceId: source.id, ...input },
                    {
                      onSuccess: () => {
                        setEditingId(null)
                        notify('success', t('ingredients:detail.sourceSaved'))
                      },
                    },
                  )
                }
                pending={mutations.updateSource.isPending}
              />
            ) : (
              <SourceRow
                key={source.id}
                source={source}
                stores={stores}
                units={units}
                onEdit={() => setEditingId(source.id)}
                onRemove={() => mutations.removeSource.mutate(source.id)}
              />
            ),
          )}
        </div>
      )}

      {addOpen ? (
        <div className="form-stack">
          <h3 className="section-subtitle">{t('ingredients:detail.addSourceTitle')}</h3>
          <SourceForm
            stores={stores}
            units={units}
            onCancel={() => setAddOpen(false)}
            onSubmit={(input) =>
              mutations.addSource.mutate(input, {
                onSuccess: () => {
                  setAddOpen(false)
                  notify('success', t('ingredients:detail.sourceAdded'))
                },
              })
            }
            pending={mutations.addSource.isPending}
          />
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={16} />
            {t('ingredients:detail.addSourceButton')}
          </button>
        </div>
      )}
    </div>
  )
}

interface SourceInput {
  store_id: number
  package_size: string
  unit_id: number
  price: string
  url: string | null
  comment: string | null
}

function SourceRow({
                     source,
                     stores,
                     units,
                     onEdit,
                     onRemove,
                   }: {
  source: IngredientSource
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
  onEdit: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation([])
  const size = toNumber(source.package_size)
  const price = toNumber(source.price)
  const perKg = size !== null && size > 0 && price !== null ? price / size : null

  return (
    <div className={styles.sourceRow}>
      <div className={styles.sourceMain}>
        <strong>
          {stores.find((store) => store.id === source.store_id)?.name ??
            source.store_id}
        </strong>
        <span className="muted">
          {formatDecimal(source.package_size)}{' '}
          {units.find((unit) => unit.id === source.unit_id)?.name ?? ''} ·{' '}
          {formatDecimal(source.price)} € ·{' '}
          {perKg === null ? '–' : `${formatDecimal(perKg, 2)} €/kg`}
        </span>
        {source.comment && <span className="muted">{source.comment}</span>}
      </div>
      <div className="row-actions">
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="icon-btn"
            title={t('ingredients:detail.openUrl')}
          >
            <ExternalLink size={15} />
          </a>
        )}
        <button
          type="button"
          className="icon-btn"
          title={t('common:actions.edit')}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t('common:actions.delete')}
          onClick={onRemove}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function SourceForm({
                      initial,
                      stores,
                      units,
                      onCancel,
                      onSubmit,
                      pending,
                    }: {
  initial?: IngredientSource
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
  onCancel?: () => void
  onSubmit: (input: SourceInput) => void
  pending: boolean
}) {
  const { t } = useTranslation([])
  const [storeId, setStoreId] = useState(initial?.store_id ?? stores[0]?.id ?? 0)
  const [packageSize, setPackageSize] = useState(
    initial ? String(initial.package_size) : '',
  )
  const [unitId, setUnitId] = useState(initial?.unit_id ?? units[0]?.id ?? 0)
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')

  const valid = storeId > 0 && unitId > 0 && packageSize.trim() && price.trim()

  return (
    <form
      className={`form-stack ${styles.sourceForm}`}
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid) return
        onSubmit({
          store_id: storeId,
          package_size: packageSize.trim(),
          unit_id: unitId,
          price: price.trim(),
          url: url.trim() || null,
          comment: comment.trim() || null,
        })
      }}
    >
      <div className="form-row">
        <label className="field">
          {t('ingredients:detail.colStore')}
          <select
            className="input"
            value={storeId}
            onChange={(event) => setStoreId(Number(event.target.value))}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t('ingredients:detail.colPrice')}
          <input
            className="input"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          {t('ingredients:detail.colPackage')}
          <input
            className="input"
            inputMode="decimal"
            value={packageSize}
            onChange={(event) => setPackageSize(event.target.value)}
          />
        </label>
        <label className="field">
          {t('ingredients:detail.colUnit')}
          <select
            className="input"
            value={unitId}
            onChange={(event) => setUnitId(Number(event.target.value))}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          {t('ingredients:detail.colUrl')}
          <input
            className="input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label className="field">
          {t('recipes:drawers.comment')}
          <input
            className="input"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('common:actions.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!valid || pending}
        >
          {pending ? (
            <Spinner size="sm" />
          ) : initial ? (
            t('common:actions.save')
          ) : (
            t('recipes:drawers.add')
          )}
        </button>
      </div>
    </form>
  )
}