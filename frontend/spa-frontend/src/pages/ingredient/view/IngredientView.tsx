import {ArrowLeft, Pencil, Plus, Trash2, X} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, useNavigate} from 'react-router-dom'
import type {IngredientDetail, Property} from '../../../api'
import {CardSection} from '../../../components/patterns/card_section/CardSection.tsx'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {EntityHeader} from '../../../components/patterns/entity_header/EntityHeader.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Badge} from '../../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useIngredient, useIngredientMutations, useIngredientUsages,} from '../../../hooks/queries/useIngredients.ts'
import {useGroups, useProperties, useStores, useUnits,} from '../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import {formatDecimal, toNumber} from '../../../lib/format.ts'
import {IngredientDataDrawer, IngredientDataForm,} from '../drawers/IngredientDataDrawer.tsx'
import {IngredientSourcesDrawer, SourcesEditor,} from '../drawers/IngredientSourcesDrawer.tsx'
import styles from './IngredientView.module.css'

export function IngredientView({
                                 ingredientId,
                                 variant = 'page',
                                 onDeleted,
                               }: {
  ingredientId: number
  variant?: 'page' | 'overlayBody'
  onDeleted?: () => void
}) {
  const { t } = useTranslation([])
  const detail = useIngredient(ingredientId)
  const isPage = variant === 'page'

  if (detail.isPending) {
    return <Spinner />
  }
  if (detail.isError || !detail.data) {
    return (
      <p className="secondary">
        {t('ingredients:detail.loadError', { error: String(detail.error) })}
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
  const { t } = useTranslation(['ingredients', "common", "nav"])
  const navigate = useNavigate()
  const ingredient = detail.ingredient
  const mutations = useIngredientMutations(ingredient.id)
  const usages = useIngredientUsages(ingredient.id)
  const groups = useGroups()
  const stores = useStores()
  const units = useUnits()
  const { canEditGroup, canManageGroup } = usePermissions()

  const editable = canEditGroup(ingredient.group_id)
  const groupName =
    groups.data?.find((group) => group.id === ingredient.group_id)?.name ??
    String(ingredient.group_id)

  const [subView, setSubView] = useState<'data' | 'sources' | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const usageCount = usages.data?.length ?? 0

  // Im Hub-Drawer (overlayBody) Unteransichten direkt im selben Drawer öffnen
  if (!isPage && subView === 'data') {
    return (
      <div className={styles.overlayBody}>
        <div className={styles.subNav}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setSubView(null)}
          >
            <ArrowLeft size={15} />
            {t('ingredients:detail.dataTitle')}
          </button>
        </div>
        <IngredientDataForm
          ingredient={detail}
          showInlineActions
          onDone={() => setSubView(null)}
        />
      </div>
    )
  }

  if (!isPage && subView === 'sources') {
    return (
      <div className={styles.overlayBody}>
        <div className={styles.subNav}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setSubView(null)}
          >
            <ArrowLeft size={15} />
            {t('ingredients:detail.sourcesDrawerTitle')}
          </button>
        </div>
        <SourcesEditor
          detail={detail}
          stores={stores.data ?? []}
          units={units.data ?? []}
        />
      </div>
    )
  }

  const headerBadges = (
    <div className={styles.badges}>
      <Badge variant="info">{formatDecimal(ingredient.energy, 2)} kJ/g</Badge>
      <Badge variant="neutral">{groupName}</Badge>
    </div>
  )

  const headerActions = (
    <div className="row-actions">
      {canManageGroup(ingredient.group_id) && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setTransferOpen(true)}
        >
          {t('common:transfer.open')}
        </button>
      )}
      {editable && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setSubView('data')}
        >
          <Pencil size={15} />
          {t('ingredients:detail.triggerData')}
        </button>
      )}
      {editable && (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={15} />
          {t('common:actions.delete')}
        </button>
      )}
    </div>
  )

  return (
    <div className={isPage ? styles.page : styles.overlayBody}>
      {isPage ? (
        <>
          <Link to="/ingredients" className={`secondary ${styles.backLink}`}>
            <ArrowLeft size={15} />
            {t('nav:ingredients')}
          </Link>

          <EntityHeader
            title={ingredient.name}
            subtitle={ingredient.comment ?? undefined}
            badges={headerBadges}
            stats={[
              {
                key: 'energy',
                label: t('ingredients:detail.energy'),
                stats: `${formatDecimal(ingredient.energy, 2)} kJ/g`,
              },
              {
                key: 'sources',
                label: t('ingredients:detail.sourcesTitle'),
                stats: "" + detail.sources.length,
              },
              {
                key: 'usages',
                label: t('ingredients:detail.usagesTitle'),
                stats: usages.isPending ? '…' : "" + usageCount,
              },
            ]}
            actions={headerActions}
          />
        </>
      ) : (
        <div className={styles.overlayHeader}>
          {headerBadges}
          {ingredient.comment && <p className="muted">{ingredient.comment}</p>}
          <div className={styles.overlayActions}>
            <Link to={`/ingredients/${ingredient.id}`} className="secondary">
              {t('ingredients:detail.fullView')}
            </Link>
            {headerActions}
          </div>
        </div>
      )}

      <PropertiesSection detail={detail} editable={editable} />
      <WeightsSection detail={detail} editable={editable} />

      <CardSection
        title={t('ingredients:detail.sourcesTitle')}
        actions={
          editable && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSubView('sources')}
            >
              <Pencil size={15} />
              {t('ingredients:detail.triggerSources')}
            </button>
          )
        }
      >
        <div className={styles.sectionBody}>
          {detail.sources.length === 0 ? (
            <p className="muted">{t('ingredients:detail.sourcesEmpty')}</p>
          ) : (
            <table className="table">
              <thead>
              <tr>
                <th>{t('ingredients:detail.colStore')}</th>
                <th className="num">{t('ingredients:detail.colPackage')}</th>
                <th className="num">{t('ingredients:detail.colPrice')}</th>
                <th className="num">€/kg</th>
                <th>{t('ingredients:detail.colUrl')}</th>
              </tr>
              </thead>
              <tbody>
              {detail.sources.map((source) => {
                const size = toNumber(source.package_size)
                const price = toNumber(source.price)
                const perKg =
                  size !== null && size > 0 && price !== null
                    ? price / size
                    : null
                const unitName =
                  units.data?.find((u) => u.id === source.unit_id)?.name ?? ''

                return (
                  <tr key={source.id}>
                    <td>
                      {stores.data?.find((s) => s.id === source.store_id)
                        ?.name ?? source.store_id}
                    </td>
                    <td className="num">
                      {formatDecimal(source.package_size)} {unitName}
                    </td>
                    <td className="num">{formatDecimal(source.price)} €</td>
                    <td className="num">
                      {perKg === null ? '–' : formatDecimal(perKg, 2)}
                    </td>
                    <td>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {t('ingredients:detail.openUrl')}
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
        </div>
      </CardSection>

      <CardSection title={t('ingredients:detail.usagesTitle')}>
        <div className={styles.sectionBody}>
          {usages.isPending ? (
            <Spinner size="sm" />
          ) : usages.isError ? (
            <p className="secondary">{String(usages.error)}</p>
          ) : usageCount === 0 ? (
            <p className="muted">{t('ingredients:detail.usagesEmpty')}</p>
          ) : (
            <ul className={styles.usageList}>
              {usages.data?.map((recipe) => (
                <li key={recipe.id}>
                  <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
                  <Badge variant="neutral">
                    {t(`recipes:detail.kind.${recipe.kind}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardSection>

      {isPage && subView === 'data' && (
        <IngredientDataDrawer
          ingredient={detail}
          onClose={() => setSubView(null)}
        />
      )}
      {isPage && subView === 'sources' && (
        <IngredientSourcesDrawer
          ingredientId={ingredient.id}
          onClose={() => setSubView(null)}
        />
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
          title={t('ingredients:detail.deleteTitle')}
          message={
            usageCount > 0
              ? t('ingredients:detail.deleteUsagesWarning', {
                name: ingredient.name,
                count: usageCount,
              })
              : t('ingredients:detail.deleteConfirm', { name: ingredient.name })
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

function PropertiesSection({
                             detail,
                             editable,
                           }: {
  detail: IngredientDetail
  editable: boolean
}) {
  const { t } = useTranslation([])
  const mutations = useIngredientMutations(detail.ingredient.id)
  const properties = useProperties()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const assigned = new Set(detail.properties.map((property) => property.id))
  const available = (properties.data ?? []).filter(
    (property: Property) => !assigned.has(property.id),
  )
  const filteredAvailable = available.filter((property) =>
    property.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <CardSection
      title={t('ingredients:detail.propertiesTitle')}
      actions={
        editable &&
        available.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPickerOpen((value) => !value)}
          >
            <Plus size={15} />
            {t('ingredients:detail.addProperty')}
          </button>
        )
      }
    >
      <div className={styles.sectionBody}>
        <div className={styles.badges}>
          {detail.properties.length === 0 && (
            <span className="muted">{t('ingredients:detail.propertiesEmpty')}</span>
          )}
          {detail.properties.map((property) => (
            <Badge key={property.id} variant="neutral">
              {property.name}
              {editable && (
                <button
                  type="button"
                  className={styles.badgeRemove}
                  title={t('common:actions.delete')}
                  onClick={() => mutations.removeProperty.mutate(property.id)}
                >
                  <X size={12} />
                </button>
              )}
            </Badge>
          ))}
        </div>

        {editable && pickerOpen && (
          <div className={styles.pickerPanel}>
            <input
              className="input"
              placeholder={t('recipes:pickers.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
            <div className={styles.pickerList}>
              {filteredAvailable.map((property) => (
                <button
                  type="button"
                  key={property.id}
                  className={styles.pickerRow}
                  onClick={() => mutations.addProperty.mutate(property.id)}
                >
                  <span>{property.name}</span>
                  <Plus size={14} />
                </button>
              ))}
              {filteredAvailable.length === 0 && (
                <p className="muted" style={{ padding: 'var(--space-3)' }}>
                  {t('recipes:pickers.empty')}
                </p>
              )}
            </div>
            <div className={styles.pickerFooter}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPickerOpen(false)}
              >
                {t('ingredients:detail.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </CardSection>
  )
}

function WeightsSection({
                          detail,
                          editable,
                        }: {
  detail: IngredientDetail
  editable: boolean
}) {
  const { t } = useTranslation([])
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
      {
        onSuccess: () => {
          setNewUnitId(0)
          setNewWeight('')
        },
      },
    )
  }

  return (
    <CardSection
      title={t('ingredients:detail.weightsTitle')}
      subtitle={t('ingredients:detail.weightsHint')}
    >
      <div className={styles.sectionBody}>
        {detail.weights.length === 0 && !editable ? (
          <p className="muted">{t('ingredients:detail.weightsEmpty')}</p>
        ) : (
          <table className="table">
            <thead>
            <tr>
              <th>{t('ingredients:detail.colUnit')}</th>
              <th className="num">{t('ingredients:detail.colWeightKg')}</th>
              {editable && <th aria-hidden="true" />}
            </tr>
            </thead>
            <tbody>
            {detail.weights.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  {t('ingredients:detail.weightsEmpty')}
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
                    onChange={(event) =>
                      setNewUnitId(Number(event.target.value))
                    }
                  >
                    <option value={0}>{t('ingredients:detail.pickUnit')}</option>
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
                    <Plus size={15} />
                    {t('recipes:drawers.add')}
                  </button>
                </td>
              </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </CardSection>
  )
}

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
  const { t } = useTranslation(['ingredients', 'common'])
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
            className="icon-btn"
            title={t('common:actions.delete')}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        </td>
      )}
    </tr>
  )
}

export function IngredientDrawer({
                                   id,
                                   onClose,
                                 }: {
  id: number
  onClose: () => void
}) {
  const { t } = useTranslation([])
  const detail = useIngredient(id)
  return (
    <Drawer
      title={detail.data?.ingredient.name ?? t('nav:ingredients')}
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