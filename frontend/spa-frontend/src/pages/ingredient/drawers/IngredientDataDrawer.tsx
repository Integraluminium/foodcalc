import {useQueryClient} from '@tanstack/react-query'
import type {FormEvent} from 'react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import type {IngredientDetail} from '../../../api'
import {ingredientsApi} from '../../../api'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useCreateIngredient, useIngredientUsages,} from '../../../hooks/queries/useIngredients.ts'
import {useGroups} from '../../../hooks/queries/useMasterData.ts'
import {useGroupPermission} from "../../../hooks/usePermissions.ts";
import styles from './IngredientDrawers.module.css'

const FORM_ID = 'ingredient-data-form'

export function IngredientDataDrawer({
                                       ingredient,
                                       onClose,
                                     }: {
  ingredient: IngredientDetail | null
  onClose: () => void
}) {
  const { t } = useTranslation([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canSubmit, setCanSubmit] = useState(Boolean(ingredient))

  return (
    <Drawer
      title={
        ingredient
          ? t('ingredients:detail.dataTitle')
          : t('ingredients:list.createTitle')
      }
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          {ingredient && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t('common:actions.delete')}
            </button>
          )}
          <span className={styles.footerSpacer} />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="btn btn--primary"
            disabled={saving || !canSubmit}
          >
            {saving ? (
              <Spinner size="sm" />
            ) : ingredient ? (
              t('common:actions.save')
            ) : (
              t('recipes:drawers.create')
            )}
          </button>
        </div>
      }
    >
      <IngredientDataForm
        formId={FORM_ID}
        ingredient={ingredient}
        onDone={onClose}
        onValidityChange={setCanSubmit}
        onPendingChange={setSaving}
        confirmDelete={confirmDelete}
        onConfirmDeleteChange={setConfirmDelete}
      />
    </Drawer>
  )
}

/**
 * Wiederverwendbares Stammdaten-Formular (sowohl im eigenen Drawer als auch
 * inline im Hub-Drawer, um verschachtelte Drawers zu vermeiden).
 */
export function IngredientDataForm({
                                     formId = FORM_ID,
                                     ingredient,
                                     onDone,
                                     showInlineActions = false,
                                     onValidityChange,
                                     onPendingChange,
                                     confirmDelete = false,
                                     onConfirmDeleteChange,
                                   }: {
  formId?: string
  ingredient: IngredientDetail | null
  onDone: () => void
  showInlineActions?: boolean
  onValidityChange?: (valid: boolean) => void
  onPendingChange?: (pending: boolean) => void
  confirmDelete?: boolean
  onConfirmDeleteChange?: (open: boolean) => void
}) {
  const { t } = useTranslation(['ingredients', 'common'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groups = useGroups()
  const usages = useIngredientUsages(ingredient?.ingredient.id ?? null)
  const create = useCreateIngredient()

  const [name, setName] = useState(ingredient?.ingredient.name ?? '')
  const [energy, setEnergy] = useState(
    ingredient ? String(ingredient.ingredient.energy) : '',
  )
  const [comment, setComment] = useState(ingredient?.ingredient.comment ?? '')
  const [groupId, setGroupId] = useState(ingredient?.ingredient.group_id ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const personalGroup = groups.data?.find((group) => group.is_personal)
  const effectiveGroupId =
    groupId ||
    ingredient?.ingredient.group_id ||
    personalGroup?.id ||
    groups.data?.[0]?.id ||
    0

  const valid = Boolean(name.trim() && energy.trim())
  const pending = saving || create.isPending

  const updatePending = (next: boolean) => {
    setSaving(next)
    onPendingChange?.(next)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!valid) return
    updatePending(true)
    setError(null)
    try {
      if (ingredient) {
        await ingredientsApi.update(ingredient.ingredient.id, {
          name: name.trim(),
          energy: energy.trim(),
          comment: comment.trim() || null,
        })
        await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
        onDone()
      } else {
        const created = await create.mutateAsync({
          name: name.trim(),
          energy: energy.trim(),
          comment: comment.trim() || null,
          group_id: effectiveGroupId,
        })
        onDone()
        void navigate(`/ingredients/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:state.error'))
    } finally {
      updatePending(false)
    }
  }

  const handleDelete = async () => {
    const { t } = useTranslation(["ingredients"])
    if (!ingredient) return
    updatePending(true)
    try {
      await ingredientsApi.remove(ingredient.ingredient.id)
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      onConfirmDeleteChange?.(false)
      onDone()
      void navigate('/ingredients')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:state.error'))
      onConfirmDeleteChange?.(false)
    } finally {
      updatePending(false)
    }
  }

  const usageCount = usages.data?.length ?? 0

  const ingredientGroupId = ingredient?.ingredient.group_id ?? 0
  let canTransferOwnerShip = useGroupPermission(ingredientGroupId, 'ingredients:transfer_owner');
  return (
    <>
      <form
        id={formId}
        className="form-stack"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="field">
          {t('ingredients:detail.name')}
          <input
            className="input"
            value={name}
            onChange={(event) => {
              const next = event.target.value
              setName(next)
              onValidityChange?.(Boolean(next.trim() && energy.trim()))
            }}
            required
            autoFocus
          />
        </label>

        <label className="field">
          {t('ingredients:detail.energy')}
          <input
            className="input"
            inputMode="decimal"
            value={energy}
            onChange={(event) => {
              const next = event.target.value
              setEnergy(next)
              onValidityChange?.(Boolean(name.trim() && next.trim()))
            }}
            required
          />
          <span className="muted">{t('ingredients:detail.energyHint')}</span>
        </label>

        <label className="field">
          {t('recipes:drawers.comment')}
          <textarea
            className="input"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        {ingredient ? (
          <div className="field">
            <span>{t('recipes:drawers.owner')}</span>
            <div className={styles.ownerRow}>
              <span>
                {groups.data?.find(
                  (group) => group.id === ingredient.ingredient.group_id,
                )?.name ?? ingredient.ingredient.group_id}
              </span>
              {canTransferOwnerShip && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setTransferOpen(true)}
                >
                  {t('common:transfer.open')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <label className="field">
            {t('recipes:drawers.owner')}
            {groups.isPending ? (
              <Spinner size="sm" />
            ) : (
              <select
                className="input"
                value={effectiveGroupId}
                onChange={(event) => setGroupId(Number(event.target.value))}
              >
                {groups.data?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ` (${t('recipes:drawers.personal')})` : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

        {error && <p className="secondary">{error}</p>}

        {showInlineActions && (
          <div className={styles.formActions}>
            <button type="button" className="btn btn--ghost" onClick={onDone}>
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={pending || !valid}
            >
              {pending ? <Spinner size="sm" /> : t('common:actions.save')}
            </button>
          </div>
        )}
      </form>

      {ingredient && confirmDelete && (
        <ConfirmDialog
          title={t('ingredients:detail.deleteTitle')}
          message={
            usageCount > 0
              ? t('ingredients:detail.deleteUsagesWarning', {
                name: ingredient.ingredient.name,
                count: usageCount,
              })
              : t('ingredients:detail.deleteConfirm', {
                name: ingredient.ingredient.name,
              })
          }
          pending={pending}
          onConfirm={() => void handleDelete()}
          onCancel={() => onConfirmDeleteChange?.(false)}
        />
      )}

      {ingredient && transferOpen && (
        <OwnerTransferDialog
          kind="ingredients"
          id={ingredient.ingredient.id}
          currentGroupId={ingredient.ingredient.group_id}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </>
  )
}