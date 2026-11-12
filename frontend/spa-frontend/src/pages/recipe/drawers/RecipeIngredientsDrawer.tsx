import { useEffect, useReducer, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ingredientsApi } from '../../../api/endpoints/ingredients.ts'
import { recipesApi } from '../../../api/endpoints/recipes.ts'
import type { RecipeDetail } from '../../../api/types.ts'
import { ConfirmDialog } from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import { Drawer } from '../../../components/patterns/drawer/Drawer.tsx'
import { Spinner } from '../../../components/ui/spinner/Spinner.tsx'
import { t } from '../../../i18n'
import { useIngredients } from '../../../hooks/queries/useIngredients.ts'
import { useRecipe, useRecipes } from '../../../hooks/queries/useRecipes.ts'
import { useUnits } from '../../../hooks/queries/useMasterData.ts'
import { formatDecimal, toNumber } from '../../../lib/format.ts'
import {
  draftFromDetail,
  draftStats,
  reducer,
  type Action,
  type DraftIngredient,
  type DraftSubRecipe,
} from '../edit/editorModel.ts'
import { IngredientPicker } from '../pickers/IngredientPicker.tsx'
import { RecipePicker } from '../pickers/RecipePicker.tsx'
import styles from './RecipeDrawers.module.css'

/**
 * Zutaten- & Komponenten-Drawer: Tabellen der Teile + ausklappbarer
 * Picker (Suche, Filter, Schnell-Anlegen). Commit diff-basiert über die
 * Teil-Endpoints — dieselbe Logik wie der bisherige Editor.
 */
export function RecipeIngredientsDrawer({
  recipeId,
  onClose,
}: {
  recipeId: number
  onClose: () => void
}) {
  const detailQuery = useRecipe(recipeId)

  if (!detailQuery.data) {
    return (
      <Drawer title={t('editor.drawer.ingredientsTitle')} onClose={onClose}>
        {detailQuery.isError ? (
          <p className="secondary">{String(detailQuery.error)}</p>
        ) : (
          <Spinner />
        )}
      </Drawer>
    )
  }
  return (
    <IngredientsEditor
      key={recipeId}
      detail={detailQuery.data}
      recipeId={recipeId}
      onClose={onClose}
    />
  )
}

function IngredientsEditor({
  detail,
  recipeId,
  onClose,
}: {
  detail: RecipeDetail
  recipeId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, dispatch] = useReducer(reducer, undefined, () => draftFromDetail(detail))
  // Snapshot bei Mount (useState statt useRef: render-sicher, lint-clean).
  const [original] = useState(draft)
  const [picker, setPicker] = useState<'ingredient' | 'sub' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)
  const stats = draftStats(draft)

  const commit = async () => {
    setSaving(true)
    setError(null)
    try {
      // Zutaten: hinzufügen → entfernen → aktualisieren (diff gegen Server).
      for (const row of draft.ingredients) {
        if (row.existingId === undefined) {
          await recipesApi.addIngredient(recipeId, {
            ingredient_id: row.ingredientId,
            amount: row.amount,
            unit_id: row.unitId,
          })
        }
      }
      const keptIngredients = new Set(
        draft.ingredients.map((row) => row.existingId).filter((id): id is number => id !== undefined),
      )
      for (const row of detail.ingredients) {
        if (!keptIngredients.has(row.ingredient_id)) {
          await recipesApi.removeIngredient(recipeId, row.ingredient_id)
        }
      }
      for (const row of draft.ingredients) {
        if (row.existingId !== undefined) {
          await recipesApi.updateIngredient(recipeId, row.existingId, {
            ingredient_id: row.ingredientId,
            amount: row.amount,
            unit_id: row.unitId,
          })
        }
      }
      // Sub-Komponenten analog.
      for (const row of draft.subRecipes) {
        if (row.existingId === undefined) {
          await recipesApi.addSubRecipe(recipeId, { child_recipe_id: row.recipeId, weight: row.weight })
        }
      }
      const keptSubs = new Set(
        draft.subRecipes.map((row) => row.existingId).filter((id): id is number => id !== undefined),
      )
      for (const row of detail.sub_recipes) {
        if (!keptSubs.has(row.recipe_id)) {
          await recipesApi.removeSubRecipe(recipeId, row.recipe_id)
        }
      }
      for (const row of draft.subRecipes) {
        if (row.existingId !== undefined) {
          await recipesApi.updateSubRecipe(recipeId, row.existingId, { weight: row.weight })
        }
      }
      void queryClient.invalidateQueries()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('state.error'))
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className={styles.footer}>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => (dirty ? setConfirmCancel(true) : onClose())}
      >
        {t('action.cancel')}
      </button>
      <span className={styles.footerSpacer} />
      {dirty && !saving && <span className="muted">{t('editor.dirty')}</span>}
      <button
        type="button"
        className="btn btn--primary"
        disabled={saving || !dirty}
        onClick={() => void commit()}
      >
        {saving ? <Spinner size="sm" /> : t('action.save')}
      </button>
    </div>
  )

  return (
    <Drawer
      title={t('editor.drawer.ingredientsTitle')}
      onClose={() => (dirty ? setConfirmCancel(true) : onClose())}
      footer={footer}
    >
      <div className={styles.calcLine}>
        <span>
          <strong>{formatDecimal(stats.weight)}</strong> kg ·{' '}
          <strong>{formatDecimal(Math.round(stats.energy))}</strong> kJ ·{' '}
          <strong>{stats.density === null ? '–' : formatDecimal(stats.density)}</strong> kJ/g
        </span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>{t('editor.parts.colIngredient')}</th>
            <th>{t('editor.parts.colAmount')}</th>
            <th className="num">{t('editor.parts.colConversion')}</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {draft.ingredients.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                {t('editor.drawer.ingredientsEmpty')}
              </td>
            </tr>
          )}
          {draft.ingredients.map((row, index) => (
            <IngredientDraftRow
              key={row.existingId ?? `new-${row.ingredientId}-${index}`}
              row={row}
              index={index}
              dispatch={dispatch}
            />
          ))}
        </tbody>
      </table>

      <table className="table">
        <thead>
          <tr>
            <th>{t('editor.drawer.colComponent')}</th>
            <th>{t('editor.drawer.colWeight')}</th>
            <th className="num">{t('editor.parts.colConversion')}</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {draft.subRecipes.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                {t('editor.drawer.subsEmpty')}
              </td>
            </tr>
          )}
          {draft.subRecipes.map((row, index) => (
            <SubDraftRow
              key={row.existingId ?? `new-${row.recipeId}-${index}`}
              row={row}
              index={index}
              dispatch={dispatch}
              selfId={recipeId}
            />
          ))}
        </tbody>
      </table>

      <div className={styles.addRow}>
        <button type="button" className="btn btn--ghost" onClick={() => setPicker('ingredient')}>
          {t('editor.drawer.addIngredient')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setPicker('sub')}>
          {t('editor.drawer.addSub')}
        </button>
      </div>

      {picker === 'ingredient' && (
        <IngredientPicker
          onAdd={(selection) => {
            dispatch({ type: 'add-ingredient', row: { ...selection, kg: null, density: null } })
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'sub' && (
        <RecipePicker
          selfRecipeId={recipeId}
          onAdd={(selection) => {
            dispatch({
              type: 'add-sub',
              row: { recipeId: selection.recipeId, weight: selection.weight, density: null },
            })
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {error && <p className="secondary">{error}</p>}

      {confirmCancel && (
        <ConfirmDialog
          title={t('editor.discardTitle')}
          message={t('editor.discardConfirm')}
          confirmLabel={t('editor.discard')}
          onConfirm={() => {
            setConfirmCancel(false)
            onClose()
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </Drawer>
  )
}

/** Zutaten-Zeile: Menge/Einheit inline, kg/kJ-Auflösung per Detail-Query. */
function IngredientDraftRow({
  row,
  index,
  dispatch,
}: {
  row: DraftIngredient
  index: number
  dispatch: (action: Action) => void
}) {
  const ingredients = useIngredients()
  const units = useUnits()
  const detail = useQuery({
    queryKey: ['ingredients', 'detail', row.ingredientId] as const,
    queryFn: () => ingredientsApi.detail(row.ingredientId),
    enabled: row.ingredientId > 0,
  })

  // Render-abgeleitet (stabile Identität, solange der Katalog-Cache hält).
  const catalogEntry = ingredients.data?.find((entry) => entry.id === row.ingredientId)

  useEffect(() => {
    const weights = detail.data?.weights ?? []
    const match = weights.find((weight) => weight.unit_id === row.unitId)
    const amount = toNumber(row.amount)
    const kg = match && amount !== null ? amount * (toNumber(match.weight) ?? 0) : null
    const density = catalogEntry ? toNumber(catalogEntry.energy) : null
    if (kg !== row.kg || density !== row.density) {
      dispatch({ type: 'update-ingredient', index, patch: { kg, density } })
    }
  }, [detail.data, catalogEntry, row.unitId, row.amount, row.kg, row.density, index, dispatch])
  const kJ =
    row.kg !== null && row.density !== null ? Math.round(row.kg * 1000 * row.density) : null

  return (
    <tr>
      <td>{catalogEntry?.name ?? row.ingredientId}</td>
      <td>
        <span className={styles.amountCell}>
          <input
            className={`input ${styles.amountInput}`}
            inputMode="decimal"
            value={row.amount}
            onChange={(event) =>
              dispatch({ type: 'update-ingredient', index, patch: { amount: event.target.value } })
            }
          />
          <select
            className={`input ${styles.unitSelect}`}
            value={row.unitId}
            onChange={(event) =>
              dispatch({ type: 'update-ingredient', index, patch: { unitId: Number(event.target.value) } })
            }
          >
            {units.data?.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </span>
      </td>
      <td className="num">
        {row.kg === null
          ? '–'
          : `${formatDecimal(row.kg)} kg${kJ === null ? '' : ` ≈ ${formatDecimal(kJ)} kJ`}`}
      </td>
      <td>
        <button
          type="button"
          className="btn btn--ghost"
          title={t('action.delete')}
          onClick={() => dispatch({ type: 'remove-ingredient', index })}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

/** Sub-Komponenten-Zeile: kg inline, Dichte via Rezept-Detail aufgelöst. */
function SubDraftRow({
  row,
  index,
  dispatch,
  selfId,
}: {
  row: DraftSubRecipe
  index: number
  dispatch: (action: Action) => void
  selfId: number
}) {
  const catalog = useRecipes()
  const recipe = useRecipe(row.recipeId)

  useEffect(() => {
    const density = recipe.data?.stats?.energy_kj_per_g ?? null
    if (density !== row.density) {
      dispatch({ type: 'update-sub', index, patch: { density } })
    }
  }, [recipe.data, row.density, index, dispatch])

  const kg = toNumber(row.weight)
  const kJ = kg !== null && row.density !== null ? Math.round(kg * 1000 * row.density) : null

  return (
    <tr>
      <td>
        {catalog.data?.find((entry) => entry.id === row.recipeId)?.name ?? row.recipeId}
        {row.recipeId === selfId && <span className="muted"> ({t('editor.drawer.selfRef')})</span>}
      </td>
      <td>
        <input
          className={`input ${styles.kgInput}`}
          inputMode="decimal"
          value={row.weight}
          onChange={(event) =>
            dispatch({ type: 'update-sub', index, patch: { weight: event.target.value } })
          }
        />
      </td>
      <td className="num">
        {kg === null ? '–' : `${formatDecimal(kg)} kg${kJ === null ? '' : ` ≈ ${formatDecimal(kJ)} kJ`}`}
      </td>
      <td>
        <button
          type="button"
          className="btn btn--ghost"
          title={t('action.delete')}
          onClick={() => dispatch({ type: 'remove-sub', index })}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}
