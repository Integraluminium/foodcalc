import { useState } from 'react'
import type { IngredientDetail } from '../../api/types'
import {
  useIngredient,
  useIngredientMutations,
} from '../../hooks/queries/useIngredients'
import {
  useGroups,
  useProperties,
  useStores,
  useUnits,
} from '../../hooks/queries/useMasterData'
import { usePermissions } from '../../hooks/usePermissions'
import { formatDecimal, toNumber } from '../../lib/format'
import { ConfirmDialog } from '../../molecules/ui/ConfirmDialog'
import { Drawer } from '../../molecules/ui/Drawer'
import { Spinner } from '../../molecules/ui/Spinner'
import styles from './IngredientView.module.css'

export type IngredientMutations = ReturnType<typeof useIngredientMutations>

/**
 * Zutaten-Inspektion und -Bearbeitung als Drawer (Master-Detail, UI_Spec
 * §3.2) — geteilte Komponente, später auch aus anderen Kontexten (z. B.
 * Rezept-Wizard) nutzbar. Bearbeitung nur mit Gruppen-Rechten.
 */
export function IngredientDrawer({
  id,
  onClose,
}: {
  id: number
  onClose: () => void
}) {
  const detail = useIngredient(id)
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
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}

function IngredientEditor({
  detail,
  onClose,
}: {
  detail: IngredientDetail
  onClose: () => void
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const groups = useGroups()
  const { canEditGroup } = usePermissions()
  const editable = canEditGroup(detail.ingredient.group_id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <BasisSection
        detail={detail}
        groups={groups.data ?? []}
        mutations={mutations}
        editable={editable}
        onDelete={() => setConfirmDelete(true)}
      />
      <SourcesSection detail={detail} mutations={mutations} editable={editable} />
      <PropertiesSection
        detail={detail}
        mutations={mutations}
        editable={editable}
      />
      <WeightsSection detail={detail} mutations={mutations} editable={editable} />

      {confirmDelete && (
        <ConfirmDialog
          title="Zutat löschen"
          message={`„${detail.ingredient.name}" wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: onClose,
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </>
  )
}

function BasisSection({
  detail,
  groups,
  mutations,
  editable,
  onDelete,
}: {
  detail: IngredientDetail
  groups: { id: number; name: string; is_personal: boolean }[]
  mutations: IngredientMutations
  editable: boolean
  onDelete: () => void
}) {
  const [draft, setDraft] = useState({
    name: detail.ingredient.name,
    energy: String(toNumber(detail.ingredient.energy) ?? ''),
    comment: detail.ingredient.comment ?? '',
    group_id: detail.ingredient.group_id,
  })
  const groupName =
    groups.find((group) => group.id === detail.ingredient.group_id)?.name ??
    `Gruppe ${detail.ingredient.group_id}`

  if (!editable) {
    return (
      <section className={styles.section}>
        <h2 className="section-subtitle">Basisdaten</h2>
        <dl className={styles.facts}>
          <dt>Name</dt>
          <dd>{detail.ingredient.name}</dd>
          <dt>Energie</dt>
          <dd>{formatDecimal(detail.ingredient.energy, 2)} kJ/g</dd>
          <dt>Kommentar</dt>
          <dd>{detail.ingredient.comment ?? '–'}</dd>
          <dt>Besitzer</dt>
          <dd>{groupName}</dd>
        </dl>
        <p className="muted">Keine Bearbeitungsrechte für diese Gruppe.</p>
      </section>
    )
  }

  return (
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
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
                {group.is_personal ? ' (persönlich)' : ''}
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
          onClick={onDelete}
        >
          Löschen
        </button>
      </div>
    </section>
  )
}

function SourcesSection({
  detail,
  mutations,
  editable,
}: {
  detail: IngredientDetail
  mutations: IngredientMutations
  editable: boolean
}) {
  const stores = useStores()
  const units = useUnits()
  const storeName = (storeId: number) =>
    stores.data?.find((store) => store.id === storeId)?.name ??
    `Store ${storeId}`
  const unitName = (unitId: number) =>
    units.data?.find((unit) => unit.id === unitId)?.name ?? String(unitId)

  if (!editable) {
    return (
      <section className={styles.section}>
        <h2 className="section-subtitle">Händler &amp; Preise</h2>
        {detail.sources.length === 0 ? (
          <p className="muted">Keine Quellen hinterlegt.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Händler</th>
                <th>Packung</th>
                <th className="num">Preis</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {detail.sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    {storeName(source.store_id)}
                    <span className="muted"> · {unitName(source.unit_id)}</span>
                  </td>
                  <td className="num">
                    {formatDecimal(source.package_size)}{' '}
                    {unitName(source.unit_id)}
                  </td>
                  <td className="num">{formatDecimal(source.price)} €</td>
                  <td>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        🔗
                      </a>
                    ) : (
                      '–'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <h2 className="section-subtitle">Händler &amp; Preise</h2>
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
              <th>Link</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {detail.sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                stores={stores.data ?? []}
                units={units.data ?? []}
                mutations={mutations}
              />
            ))}
          </tbody>
        </table>
      )}
      <AddSourceRow
        stores={stores.data ?? []}
        units={units.data ?? []}
        mutations={mutations}
      />
    </section>
  )
}

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
        {source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" title={source.url}>
            🔗
          </a>
        ) : (
          '–'
        )}
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
  const [url, setUrl] = useState('')

  const handleAdd = () => {
    if (!storeId || !packageSize || !unitId || !price) return
    mutations.addSource.mutate(
      {
        store_id: Number(storeId),
        package_size: packageSize,
        unit_id: Number(unitId),
        price,
        url: url.trim() || null,
        comment: null,
      },
      {
        onSuccess: () => {
          setPackageSize('')
          setPrice('')
          setUrl('')
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
      <label className="field">
        Link / Produkt-ID (optional)
        <input
          className="input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
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
  mutations,
  editable,
}: {
  detail: IngredientDetail
  mutations: IngredientMutations
  editable: boolean
}) {
  const properties = useProperties()
  const [newPropertyId, setNewPropertyId] = useState('')
  const assignedIds = new Set(detail.properties.map((property) => property.id))
  const available = (properties.data ?? []).filter(
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
            {editable && (
              <button
                type="button"
                className={styles.badgeRemove}
                title="Entfernen"
                onClick={() => mutations.removeProperty.mutate(property.id)}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {editable && available.length > 0 && (
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
          aria-label="Eigenschaft hinzufügen"
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
  mutations,
  editable,
}: {
  detail: IngredientDetail
  mutations: IngredientMutations
  editable: boolean
}) {
  const units = useUnits()
  const availableUnits = (units.data ?? []).filter(
    (unit) => !detail.weights.some((weight) => weight.unit_id === unit.id),
  )
  const [newUnitId, setNewUnitId] = useState('')
  const [newWeight, setNewWeight] = useState('')

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
                    {units.data?.find((unit) => unit.id === weight.unit_id)
                      ?.name ?? weight.unit_id}
                  </td>
                  <td>
                    {editable ? (
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
                    ) : (
                      formatDecimal(weight.weight)
                    )}
                  </td>
                  <td>
                    {editable && (
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
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {editable && availableUnits.length > 0 && (
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
