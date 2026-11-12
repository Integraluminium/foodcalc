import { useState } from 'react'
import type { IngredientDetail, IngredientSource } from '../../../api/types.ts'
import { Drawer } from '../../../components/patterns/drawer/Drawer.tsx'
import { Spinner } from '../../../components/ui/spinner/Spinner.tsx'
import { t } from '../../../i18n'
import {
  useIngredient,
  useIngredientMutations,
} from '../../../hooks/queries/useIngredients.ts'
import { useStores, useUnits } from '../../../hooks/queries/useMasterData.ts'
import { formatDecimal, toNumber } from '../../../lib/format.ts'
import styles from './IngredientDrawers.module.css'

/**
 * Bezugsquellen-Drawer: Tabelle mit Inline-Edit-Zeilen (✎) und Add-Zeile.
 * Jede Änderung committet direkt über die Source-Endpoints (kleine,
 * isolierte Operationen — kein Gesamtdokument wie beim Rezept).
 */
export function IngredientSourcesDrawer({
  ingredientId,
  onClose,
}: {
  ingredientId: number
  onClose: () => void
}) {
  const detail = useIngredient(ingredientId)
  const stores = useStores()
  const units = useUnits()

  const body = detail.data ? (
    <SourcesEditor detail={detail.data} stores={stores.data ?? []} units={units.data ?? []} />
  ) : detail.isError ? (
    <p className="secondary">{String(detail.error)}</p>
  ) : (
    <Spinner />
  )

  return (
    <Drawer title={t('ingredient.sourcesDrawerTitle')} onClose={onClose}>
      {body}
    </Drawer>
  )
}

function SourcesEditor({
  detail,
  stores,
  units,
}: {
  detail: IngredientDetail
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const [editingId, setEditingId] = useState<number | null>(null)

  return (
    <>
      {detail.sources.length === 0 && (
        <p className="muted">{t('ingredient.sourcesEmpty')}</p>
      )}
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
                  { onSuccess: () => setEditingId(null) },
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

      <h3 className="section-subtitle">{t('ingredient.addSourceTitle')}</h3>
      <SourceForm
        stores={stores}
        units={units}
        onCancel={undefined}
        onSubmit={(input) => mutations.addSource.mutate(input)}
        pending={mutations.addSource.isPending}
      />
    </>
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
  const size = toNumber(source.package_size)
  const price = toNumber(source.price)
  const perKg = size !== null && size > 0 && price !== null ? price / size : null

  return (
    <div className={styles.sourceRow}>
      <div className={styles.sourceMain}>
        <strong>
          {stores.find((store) => store.id === source.store_id)?.name ?? source.store_id}
        </strong>
        <span className="muted">
          {formatDecimal(source.package_size)}{' '}
          {units.find((unit) => unit.id === source.unit_id)?.name ?? ''} ·{' '}
          {formatDecimal(source.price)} € ·{' '}
          {perKg === null ? '–' : `${formatDecimal(perKg, 2)} €/kg`}
        </span>
      </div>
      <div className={styles.sourceActions}>
        {source.url && (
          <a href={source.url} target="_blank" rel="noreferrer">
            {t('ingredient.openUrl')}
          </a>
        )}
        <button type="button" className="btn btn--ghost" onClick={onEdit}>
          {t('action.edit')}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          title={t('action.delete')}
          onClick={onRemove}
        >
          ✕
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
  onCancel?: (() => void) | undefined
  onSubmit: (input: SourceInput) => void
  pending: boolean
}) {
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
      className={styles.sourceForm}
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
      <div className={styles.sourceGrid}>
        <label className="field">
          {t('ingredient.colStore')}
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
          {t('ingredient.colPackage')}
          <input
            className="input"
            inputMode="decimal"
            value={packageSize}
            onChange={(event) => setPackageSize(event.target.value)}
          />
        </label>
        <label className="field">
          {t('ingredient.colUnit')}
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
        <label className="field">
          {t('ingredient.colPrice')}
          <input
            className="input"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.sourceGrid2}>
        <label className="field">
          {t('ingredient.colUrl')}
          <input
            className="input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label className="field">
          {t('editor.drawer.comment')}
          <input
            className="input"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.sourceActions}>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('action.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!valid || pending}
        >
          {pending ? <Spinner size="sm" /> : initial ? t('action.save') : t('editor.drawer.add')}
        </button>
      </div>
    </form>
  )
}
