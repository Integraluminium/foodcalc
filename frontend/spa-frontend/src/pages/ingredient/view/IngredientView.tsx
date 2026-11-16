import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import type {IngredientDetail, Property} from '../../../api/types.ts'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useIngredient, useIngredientMutations, useIngredientUsages,} from '../../../hooks/queries/useIngredients.ts'
import {useGroups, useProperties, useStores, useUnits} from '../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import {t} from '../../../i18n'
import {formatDecimal, toNumber} from '../../../lib/format.ts'
import {IngredientDataDrawer} from '../drawers/IngredientDataDrawer.tsx'
import {IngredientSourcesDrawer} from '../drawers/IngredientSourcesDrawer.tsx'
import styles from './IngredientView.module.css'

/**
 * Zutaten-Ansicht (page = Deep-Link /ingredients/:id, overlayBody = Hub-Drawer):
 * Read-Übersicht mit Inline-Kleingedits (Eigenschaften, Einheitsgewichte) und
 * Triggern für die Bearbeiter-Drawers (Stammdaten, Bezugsquellen). Muster wie
 * RecipeView — keine versehentliche Bearbeitung, Edit-Aktionen sind explizit.
 */
export function IngredientView({
  ingredientId,
  variant = 'page',
  onDeleted,
}: {
  ingredientId: number
  variant?: 'page' | 'overlayBody'
  onDeleted?: () => void
}) {
  const detail = useIngredient(ingredientId)
  const isPage = variant === 'page'

  if (detail.isPending) {
    return <Spinner />
  }
  if (detail.isError || !detail.data) {
    return (
      <p className="secondary">
        {t('ingredient.loadError', { error: String(detail.error) })}
      </p>
    )
  }
  return (
    <IngredientViewBody
      detail={detail.data}
      isPage={isPage}
      onDeleted={onDeleted}
    />
  )
}

function IngredientViewBody({
  detail,
  isPage,
  onDeleted,
}: {
  detail: IngredientDetail
  isPage: boolean
  onDeleted?: () => void
}) {
  const navigate = useNavigate()
  const ingredient = detail.ingredient
  const mutations = useIngredientMutations(ingredient.id)
  const usages = useIngredientUsages(ingredient.id)
  const groups = useGroups()
  const stores = useStores()
  const { canEditGroup, canManageGroup } = usePermissions()

  const editable = canEditGroup(ingredient.group_id)
  const groupName =
    groups.data?.find((group) => group.id === ingredient.group_id)?.name ??
    ingredient.group_id

  const [drawer, setDrawer] = useState<'data' | 'sources' | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const usageCount = usages.data?.length ?? 0

  return (
    <div className={isPage ? styles.page : styles.overlayBody}>
      {isPage && (
        <Link to="/ingredients" className="secondary">
          ← {t('nav.ingredients')}
        </Link>
      )}

      <div className={`card ${styles.header}`}>
        <div className={styles.headerMain}>
          <h1 className="section-title">{ingredient.name}</h1>
          <div className={styles.badges}>
            <span className="badge badge--info">
              {formatDecimal(ingredient.energy, 2)} kJ/g
            </span>
            <span className="badge badge--neutral">{groupName}</span>
          </div>
          {ingredient.comment && <p className="muted">{ingredient.comment}</p>}
        </div>
        <div className={styles.headerActions}>
          {canManageGroup(ingredient.group_id) && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setTransferOpen(true)}
            >
              {t('transfer.open')}
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setDrawer('data')}
            >
              {t('ingredient.triggerData')}
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t('action.delete')}
            </button>
          )}
        </div>
      </div>

      {!isPage && (
        <Link to={`/ingredients/${ingredient.id}`} className="secondary">
          {t('ingredient.fullView')}
        </Link>
      )}

      <PropertiesSection detail={detail} editable={editable} />
      <WeightsSection detail={detail} editable={editable} />

      <section className="card">
        <h2 className="section-subtitle">{t('ingredient.sourcesTitle')}</h2>
        {detail.sources.length === 0 ? (
          <p className="muted">{t('ingredient.sourcesEmpty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('ingredient.colStore')}</th>
                <th className="num">{t('ingredient.colPackage')}</th>
                <th className="num">{t('ingredient.colPrice')}</th>
                <th className="num">€/kg</th>
                <th>{t('ingredient.colUrl')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.sources.map((source) => {
                const size = toNumber(source.package_size)
                const price = toNumber(source.price)
                const perKg = size !== null && size > 0 && price !== null ? price / size : null
                return (
                  <tr key={source.id}>
                    <td>
                      {stores.data?.find((store) => store.id === source.store_id)?.name ??
                        source.store_id}
                    </td>
                    <td className="num">{formatDecimal(source.package_size)}</td>
                    <td className="num">{formatDecimal(source.price)}</td>
                    <td className="num">
                      {perKg === null ? '–' : formatDecimal(perKg, 2)}
                    </td>
                    <td>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {t('ingredient.openUrl')}
                        </a>
                      ) : (
                        '–'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

        )}
        {editable && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setDrawer('sources')}
          >
            {t('ingredient.triggerSources')}
          </button>
        )}
      </section>

      <section className="card">
        <h2 className="section-subtitle">{t('ingredient.usagesTitle')}</h2>
        {usages.isPending ? (
          <Spinner size="sm" />
        ) : usages.isError ? (
          <p className="secondary">{String(usages.error)}</p>
        ) : (usages.data?.length ?? 0) === 0 ? (
          <p className="muted">{t('ingredient.usagesEmpty')}</p>
        ) : (
          <ul className={styles.usageList}>
            {usages.data?.map((recipe) => (
              <li key={recipe.id}>
                <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
                <span className="badge badge--neutral">
                  {t(`recipe.kind.${recipe.kind}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {drawer === 'data' && (
        <IngredientDataDrawer ingredient={detail} onClose={() => setDrawer(null)} />
      )}
      {drawer === 'sources' && (
        <IngredientSourcesDrawer ingredientId={ingredient.id} onClose={() => setDrawer(null)} />
      )}
      {transferOpen && (
        <OwnerTransferDialog
          kind="ingredients"
          id={ingredient.id}
          currentGroupId={ingredient.group_id}
          onClose={() => setTransferOpen(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('ingredient.deleteTitle')}
          message={
            usageCount > 0
              ? t('ingredient.deleteUsagesWarning', {
                  name: ingredient.name,
                  count: usageCount,
                })
              : t('ingredient.deleteConfirm', { name: ingredient.name })
          }
          pending={mutations.remove.isPending}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: () => {
                setConfirmDelete(false)
                if (!isPage) onDeleted?.()
                else void navigate('/ingredients')
              },
            })
          }
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

/** Eigenschaften: Badges mit Inline-Entfernen + Add-Select (Edit-Modus). */
function PropertiesSection({
  detail,
  editable,
}: {
  detail: IngredientDetail
  editable: boolean
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const properties = useProperties()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const assigned = new Set(detail.properties.map((property) => property.id))
  const available = (properties.data ?? []).filter(
    (property: Property) => !assigned.has(property.id),
  )

  return (
    <section className="card">
      <h2 className="section-subtitle">{t('ingredient.propertiesTitle')}</h2>
      <div className={styles.badges}>
        {detail.properties.length === 0 && (
          <span className="muted">{t('ingredient.propertiesEmpty')}</span>
        )}
        {detail.properties.map((property) => (
          <span key={property.id} className="badge badge--neutral">
            {property.name}
            {editable && (
              <button
                type="button"
                className={styles.badgeRemove}
                title={t('action.delete')}
                onClick={() => mutations.removeProperty.mutate(property.id)}
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>
      {editable && available.length > 0 && (
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPickerOpen((value) => !value)}
          >
            {t('ingredient.addProperty')}
          </button>
          {pickerOpen && (
            <div className={styles.pickerPanel}>
              <input
                className="input"
                placeholder={t('editor.drawer.pickerSearch')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
              <div className={styles.pickerList}>
                {available
                  .filter((property) =>
                    property.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((property) => (
                    <button
                      type="button"
                      key={property.id}
                      className={styles.pickerRow}
                      onClick={() => mutations.addProperty.mutate(property.id)}
                    >
                      <span>{property.name}</span>
                    </button>
                  ))}
                {available.filter((property) =>
                  property.name.toLowerCase().includes(search.toLowerCase()),
                ).length === 0 && (
                  <p className="muted">{t('editor.drawer.pickerEmpty')}</p>
                )}
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPickerOpen(false)}
              >
                {t('ingredient.done')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** Einheitsgewichte: Tabelle mit onBlur-Commit + Add-Zeile (Edit-Modus). */
function WeightsSection({
  detail,
  editable,
}: {
  detail: IngredientDetail
  editable: boolean
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const units = useUnits()
  const assignedUnits = new Set(detail.weights.map((weight) => weight.unit_id))
  const availableUnits = (units.data ?? []).filter(
    (unit) => !assignedUnits.has(unit.id),
  )
  const [newUnitId, setNewUnitId] = useState(0)
  const [newWeight, setNewWeight] = useState('')

  const addWeight = () => {
    if (newUnitId === 0 || !newWeight.trim()) return
    mutations.addWeight.mutate(
      { unit_id: newUnitId, weight: newWeight.trim() },
      { onSuccess: () => {
        setNewUnitId(0)
        setNewWeight('')
      } },
    )
  }

  return (
    <section className="card">
      <h2 className="section-subtitle">{t('ingredient.weightsTitle')}</h2>
      <p className="muted">{t('ingredient.weightsHint')}</p>
      {detail.weights.length === 0 && !editable ? (
        <p className="muted">{t('ingredient.weightsEmpty')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('ingredient.colUnit')}</th>
              <th className="num">{t('ingredient.colWeightKg')}</th>
              {editable && <th aria-hidden="true" />}
            </tr>
          </thead>
          <tbody>
            {detail.weights.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  {t('ingredient.weightsEmpty')}
                </td>
              </tr>
            )}
            {detail.weights.map((weight) => (
              <WeightRow
                key={weight.unit_id}
                weight={weight}
                editable={editable}
                onCommit={(kg) =>
                  mutations.updateWeight.mutate({
                    unitId: weight.unit_id,
                    weight: kg,
                  })
                }
                onRemove={() => mutations.removeWeight.mutate(weight.unit_id)}
              />
            ))}
          </tbody>
          {editable && availableUnits.length > 0 && (
            <tfoot>
              <tr>
                <td>
                  <select
                    className="input"
                    value={newUnitId}
                    onChange={(event) => setNewUnitId(Number(event.target.value))}
                  >
                    <option value={0}>{t('ingredient.pickUnit')}</option>
                    {availableUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num">
                  <input
                    className={`input ${styles.weightInput}`}
                    inputMode="decimal"
                    value={newWeight}
                    onChange={(event) => setNewWeight(event.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={newUnitId === 0 || !newWeight.trim()}
                    onClick={addWeight}
                  >
                    {t('editor.drawer.add')}
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </section>
  )
}

/** Gewichtszeile: Inline-Input, Commit bei Blur (kein Commit bei Tippfehler). */
function WeightRow({
  weight,
  editable,
  onCommit,
  onRemove,
}: {
  weight: { unit_id: number; weight: string | number }
  editable: boolean
  onCommit: (kg: string) => void
  onRemove: () => void
}) {
  const units = useUnits()
  const [value, setValue] = useState(String(weight.weight))

  return (
    <tr>
      <td>
        {units.data?.find((unit) => unit.id === weight.unit_id)?.name ??
          weight.unit_id}
      </td>
      <td className="num">
        {editable ? (
          <input
            className={`input ${styles.weightInput}`}
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => {
              if (value.trim() && value !== String(weight.weight)) {
                onCommit(value.trim())
              }
            }}
          />
        ) : (
          formatDecimal(weight.weight)
        )}
      </td>
      {editable && (
        <td>
          <button
            type="button"
            className="btn btn--ghost"
            title={t('action.delete')}
            onClick={onRemove}
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  )
}

/** Hub-Drawer: zeigt die geteilte Ansicht als Overlay-Body. */
export function IngredientDrawer({
  id,
  onClose,
}: {
  id: number
  onClose: () => void
}) {
  const detail = useIngredient(id)
  return (
    <Drawer
      title={detail.data?.ingredient.name ?? t('nav.ingredients')}
      onClose={onClose}
    >
      <IngredientView
        ingredientId={id}
        variant="overlayBody"
        onDeleted={onClose}
      />
    </Drawer>
  )
}
