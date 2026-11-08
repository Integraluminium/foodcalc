import { useState } from 'react'
import type { FormEvent } from 'react'
import { Dialog } from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  useCreateIngredient,
  useIngredients,
} from '../hooks/queries/useIngredients'
import { useCurrentUser } from '../hooks/useAuth'
import { useActiveGroup } from '../hooks/useActiveGroup'
import { useGroups } from '../hooks/queries/useMasterData'
import { formatDecimal } from '../lib/format'
import styles from './IngredientsPage.module.css'

export default function IngredientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const ingredients = useIngredients(debouncedSearch || undefined)
  const { data: user } = useCurrentUser()
  const { activeGroupId } = useActiveGroup()
  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Ingredients</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          + Neue Zutat
        </button>
      </div>

      <input
        className={`input ${styles.search}`}
        placeholder="Zutaten durchsuchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className={`card ${styles.panel}`}>
        {ingredients.isPending ? (
          <div className={styles.empty}>
            <Spinner />
          </div>
        ) : ingredients.isError ? (
          <div className={styles.empty}>
            <p className="secondary">
              Zutaten konnten nicht geladen werden: {String(ingredients.error)}
            </p>
          </div>
        ) : ingredients.data.length === 0 ? (
          <div className={styles.empty}>
            <p className="secondary">
              Keine Zutaten gefunden. Lege die erste über „Neue Zutat" an.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Energie (kJ/g)</th>
                <th>Kommentar</th>
                <th>Quellen</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.data.map((ingredient) => (
                <tr
                  key={ingredient.id}
                  className={styles.row}
                  onClick={() => setOpenId(ingredient.id)}
                >
                  <td>{ingredient.name}</td>
                  <td className="num">{formatDecimal(ingredient.energy, 2)}</td>
                  <td className="secondary">{ingredient.comment || '–'}</td>
                  <td>
                    <span
                      className={`badge ${
                        ingredient.has_sources
                          ? 'badge--success'
                          : 'badge--warning'
                      }`}
                    >
                      {ingredient.has_sources ? 'vorhanden' : 'fehlen'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && user && (
        <CreateIngredientDialog
          defaultGroupId={activeGroupId ?? user.groups[0]?.id ?? 0}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false)
            setOpenId(id)
          }}
        />
      )}
      {openId !== null && (
        <IngredientDrawer id={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}

function CreateIngredientDialog({
  defaultGroupId,
  onClose,
  onCreated,
}: {
  defaultGroupId: number
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const groups = useGroups()
  const create = useCreateIngredient()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        energy: String(data.get('energy') ?? '').trim(),
        comment: String(data.get('comment') ?? '').trim() || null,
        group_id:
          Number(data.get('group_id') ?? defaultGroupId) || defaultGroupId,
      },
      { onSuccess: (ingredient) => onCreated(ingredient.id) },
    )
  }

  return (
    <Dialog
      title="Neue Zutat"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="create-ingredient-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? <Spinner size="sm" /> : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-ingredient-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus />
          </label>
          <label className="field">
            Energie (kJ/g)
            <input
              className="input"
              name="energy"
              type="number"
              step="any"
              min="0"
              required
              placeholder="z. B. 14.5"
            />
          </label>
          <label className="field">
            Owner-Gruppe
            <select
              className="input"
              name="group_id"
              defaultValue={defaultGroupId}
            >
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {group.is_personal ? ' (persönlich)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Kommentar
            <input className="input" name="comment" placeholder="optional" />
          </label>
        </div>
      </form>
    </Dialog>
  )
}

import { Drawer } from '../components/ui/Drawer'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  useIngredient,
  useIngredientMutations,
} from '../hooks/queries/useIngredients'
import {
  useProperties,
  useStores,
  useUnits,
} from '../hooks/queries/useMasterData'
import { toNumber } from '../lib/format'
import type { IngredientDetail } from '../api/types'

function IngredientDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = useIngredient(id)
  const stores = useStores()
  const units = useUnits()
  const properties = useProperties()
  const data = detail.data

  return (
    <Drawer title={data?.ingredient.name ?? 'Zutat'} onClose={onClose}>
      {detail.isPending ? (
        <Spinner />
      ) : detail.isError || !data ? (
        <p className="secondary">
          Zutat konnte nicht geladen werden: {String(detail.error)}
        </p>
      ) : (
        <IngredientEditor
          key={`${data.ingredient.id}:${data.ingredient.name}:${data.ingredient.energy}:${data.ingredient.group_id}:${data.ingredient.comment ?? ''}`}
          detail={data}
          stores={stores.data ?? []}
          units={units.data ?? []}
          properties={properties.data ?? []}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}

function IngredientEditor({
  detail,
  stores,
  units,
  properties,
  onClose,
}: {
  detail: IngredientDetail
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
  properties: { id: number; name: string }[]
  onClose: () => void
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const [draft, setDraft] = useState({
    name: detail.ingredient.name,
    energy: String(toNumber(detail.ingredient.energy) ?? ''),
    comment: detail.ingredient.comment ?? '',
    group_id: detail.ingredient.group_id,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const groups = useGroups()

  return (
    <>
      <section className={styles.section}>
        <h2 className="section-subtitle">Basisdaten</h2>
        <label className="field">
          Name
          <input
            className="input"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        <div className="form-row">
          <label className="field">
            Energie (kJ/g)
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              value={draft.energy}
              onChange={(event) =>
                setDraft({ ...draft, energy: event.target.value })
              }
            />
          </label>
          <label className="field">
            Owner-Gruppe
            <select
              className="input"
              value={draft.group_id}
              onChange={(event) =>
                setDraft({ ...draft, group_id: Number(event.target.value) })
              }
            >
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Kommentar
          <input
            className="input"
            value={draft.comment}
            onChange={(event) =>
              setDraft({ ...draft, comment: event.target.value })
            }
          />
        </label>
        <div className={styles.rowActions}>
          <button
            type="button"
            className="btn btn--primary"
            disabled={mutations.update.isPending}
            onClick={() =>
              mutations.update.mutate({
                name: draft.name.trim(),
                energy: draft.energy.trim(),
                comment: draft.comment.trim() || null,
                group_id: draft.group_id,
              })
            }
          >
            Speichern
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Löschen
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="section-subtitle">Quellen (Händler &amp; Preise)</h2>
        {detail.sources.length === 0 ? (
          <p className="muted">Keine Quellen — unten hinzufügen.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Händler</th>
                <th>Packung (kg)</th>
                <th>Einheit</th>
                <th>Preis (€)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {detail.sources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  stores={stores}
                  units={units}
                  mutations={mutations}
                />
              ))}
            </tbody>
          </table>
        )}
        <AddSourceRow stores={stores} units={units} mutations={mutations} />
      </section>
      {confirmDelete && (
        <ConfirmDialog
          title="Zutat löschen"
          message={`„${detail.ingredient.name}" wirklich löschen? Wird in Rezepten verwendet, schlägt das fehl.`}
          onConfirm={() => mutations.remove.mutate(undefined, { onSuccess: onClose })}
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
      <PropertiesSection detail={detail} properties={properties} mutations={mutations} />
      <WeightsSection detail={detail} units={units} mutations={mutations} />
    </>
  )
}

type IngredientMutations = ReturnType<typeof useIngredientMutations>

function SourceRow({
  source,
  stores,
  units,
  mutations,
}: {
  source: IngredientDetail['sources'][number]
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
  mutations: IngredientMutations
}) {
  const commit = (patch: {
    store_id?: number
    package_size?: string
    unit_id?: number
    price?: string
  }) => {
    mutations.updateSource.mutate({
      sourceId: source.id,
      store_id: patch.store_id ?? source.store_id,
      package_size:
        patch.package_size ?? String(toNumber(source.package_size) ?? ''),
      unit_id: patch.unit_id ?? source.unit_id,
      price: patch.price ?? String(toNumber(source.price) ?? ''),
      url: source.url,
      comment: source.comment,
    })
  }

  return (
    <tr
      key={`${source.id}-${source.store_id}-${source.package_size}-${source.unit_id}-${source.price}`}
    >
      <td>
        <select
          className="input"
          value={source.store_id}
          onChange={(event) => commit({ store_id: Number(event.target.value) })}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="input"
          type="number"
          step="any"
          min="0"
          defaultValue={String(toNumber(source.package_size) ?? '')}
          onBlur={(event) => {
            if (event.target.value !== String(toNumber(source.package_size) ?? ''))
              commit({ package_size: event.target.value })
          }}
        />
      </td>
      <td>
        <select
          className="input"
          value={source.unit_id}
          onChange={(event) => commit({ unit_id: Number(event.target.value) })}
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="input"
          type="number"
          step="any"
          min="0"
          defaultValue={String(toNumber(source.price) ?? '')}
          onBlur={(event) => {
            if (event.target.value !== String(toNumber(source.price) ?? ''))
              commit({ price: event.target.value })
          }}
        />
      </td>
      <td>
        <button
          type="button"
          className={styles.iconButton}
          title="Quelle entfernen"
          onClick={() => mutations.removeSource.mutate(source.id)}
        >
          🗑
        </button>
      </td>
    </tr>
  )
}

function AddSourceRow({
  stores,
  units,
  mutations,
}: {
  stores: { id: number; name: string }[]
  units: { id: number; name: string }[]
  mutations: IngredientMutations
}) {
  const [storeId, setStoreId] = useState('')
  const [packageSize, setPackageSize] = useState('')
  const [unitId, setUnitId] = useState('')
  const [price, setPrice] = useState('')

  const handleAdd = () => {
    if (!storeId || !packageSize || !unitId || !price) return
    mutations.addSource.mutate(
      {
        store_id: Number(storeId),
        package_size: packageSize,
        unit_id: Number(unitId),
        price,
        url: null,
        comment: null,
      },
      {
        onSuccess: () => {
          setPackageSize('')
          setPrice('')
        },
      },
    )
  }

  return (
    <div className="form-row">
      <label className="field">
        Händler
        <select
          className="input"
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
        >
          <option value="">Auswählen…</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Packung (kg)
        <input
          className="input"
          type="number"
          step="any"
          min="0"
          value={packageSize}
          onChange={(event) => setPackageSize(event.target.value)}
        />
      </label>
      <label className="field">
        Einheit
        <select
          className="input"
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
        >
          <option value="">Auswählen…</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Preis (€)
        <input
          className="input"
          type="number"
          step="any"
          min="0"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleAdd}
        disabled={mutations.addSource.isPending}
      >
        Hinzufügen
      </button>
    </div>
  )
}

function PropertiesSection({
  detail,
  properties,
  mutations,
}: {
  detail: IngredientDetail
  properties: { id: number; name: string }[]
  mutations: IngredientMutations
}) {
  const [newPropertyId, setNewPropertyId] = useState('')
  const assignedIds = new Set(detail.properties.map((property) => property.id))
  const available = properties.filter(
    (property) => !assignedIds.has(property.id),
  )

  return (
    <section className={styles.section}>
      <h2 className="section-subtitle">Eigenschaften &amp; Allergene</h2>
      <div className={styles.badges}>
        {detail.properties.length === 0 && <p className="muted">Keine.</p>}
        {detail.properties.map((property) => (
          <span key={property.id} className="badge badge--neutral">
            {property.name}
            <button
              type="button"
              className={styles.badgeRemove}
              title="Entfernen"
              onClick={() => mutations.removeProperty.mutate(property.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <select
          className="input"
          value={newPropertyId}
          onChange={(event) => {
            setNewPropertyId(event.target.value)
            if (event.target.value) {
              mutations.addProperty.mutate(Number(event.target.value))
              setNewPropertyId('')
            }
          }}
        >
          <option value="">Eigenschaft hinzufügen…</option>
          {available.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      )}
    </section>
  )
}

function WeightsSection({
  detail,
  units,
  mutations,
}: {
  detail: IngredientDetail
  units: { id: number; name: string }[]
  mutations: IngredientMutations
}) {
  const [newUnitId, setNewUnitId] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const assignedUnits = new Set(detail.weights.map((weight) => weight.unit_id))
  const availableUnits = units.filter((unit) => !assignedUnits.has(unit.id))

  const handleAdd = () => {
    if (!newUnitId || !newWeight) return
    mutations.addWeight.mutate(
      { unit_id: Number(newUnitId), weight: newWeight },
      { onSuccess: () => setNewWeight('') },
    )
  }

  return (
    <section className={styles.section}>
      <h2 className="section-subtitle">Gewichte pro Einheit (kg)</h2>
      <p className="muted">
        Ermöglicht Mengen-Umrechnungen (z. B. 1 Prise = 0.002 kg) — Basis für
        Einkaufslisten.
      </p>
      {detail.weights.length === 0 ? (
        <p className="muted">Keine Einheitsgewichte.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Einheit</th>
              <th>Gewicht (kg)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {detail.weights.map((weight) => {
              const value = String(toNumber(weight.weight) ?? '')
              return (
                <tr key={weight.unit_id}>
                  <td>
                    {units.find((unit) => unit.id === weight.unit_id)?.name ??
                      weight.unit_id}
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      min="0"
                      key={`${weight.unit_id}-${weight.weight}`}
                      defaultValue={value}
                      onBlur={(event) => {
                        if (event.target.value !== value)
                          mutations.updateWeight.mutate({
                            unitId: weight.unit_id,
                            weight: event.target.value,
                          })
                      }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Gewicht entfernen"
                      onClick={() =>
                        mutations.removeWeight.mutate(weight.unit_id)
                      }
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {availableUnits.length > 0 && (
        <div className="form-row">
          <label className="field">
            Einheit
            <select
              className="input"
              value={newUnitId}
              onChange={(event) => setNewUnitId(event.target.value)}
            >
              <option value="">Auswählen…</option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Gewicht (kg)
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              value={newWeight}
              onChange={(event) => setNewWeight(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAdd}
            disabled={mutations.addWeight.isPending}
          >
            Hinzufügen
          </button>
        </div>
      )}
    </section>
  )
}
