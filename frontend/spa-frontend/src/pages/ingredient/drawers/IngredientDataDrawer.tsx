import {useQueryClient} from '@tanstack/react-query'
import {t} from "i18next";
import type {FormEvent} from 'react'
import {useState} from 'react'
import {useNavigate} from 'react-router'
import {ingredientsApi} from '../../../api/endpoints/ingredients.ts'
import type {IngredientDetail} from '../../../api/types.ts'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useCreateIngredient, useIngredientUsages} from '../../../hooks/queries/useIngredients.ts'
import {useGroups} from '../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import styles from './IngredientDrawers.module.css'

/**
 * Stammdaten-Drawer der Zutat — Anlegen (Create, `ingredient = null`) und
 * Bearbeiten (Name/Energie/Kommentar). Owner-Wechsel gehört explizit zur
 * Besitz-Übertragung, nicht ins Formular.
 */
export function IngredientDataDrawer({
  ingredient,
  onClose,
}: {
  ingredient: IngredientDetail | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groups = useGroups()
  const { canManageGroup } = usePermissions()
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const personalGroup = groups.data?.find((group) => group.is_personal)
  const effectiveGroupId =
    groupId || ingredient?.ingredient.group_id || personalGroup?.id || groups.data?.[0]?.id || 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !energy.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (ingredient) {
        await ingredientsApi.update(ingredient.ingredient.id, {
          name: name.trim(),
          energy: energy.trim(),
          comment: comment.trim() || null,
        })
        void queryClient.invalidateQueries()
        onClose()
      } else {
        const created = await ingredientsApi.create({
          name: name.trim(),
          energy: energy.trim(),
          comment: comment.trim() || null,
          group_id: effectiveGroupId,
        })
        void queryClient.invalidateQueries()
        onClose()
        void navigate(`/ingredients/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message :t('common:state.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ingredient) return
    setSaving(true)
    try {
      await ingredientsApi.remove(ingredient.ingredient.id)
      void queryClient.invalidateQueries()
      setConfirmDelete(false)
      onClose()
      void navigate('/ingredients')
    } catch (err) {
      setError(err instanceof Error ? err.message :t('common:state.error'))
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  const pending = saving || create.isPending
  const usageCount = usages.data?.length ?? 0

  return (
    <Drawer
      title={
        ingredient ?t('ingredients:detail.dataTitle') :t('ingredients:list.createTitle')
      }
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          {t('ingredients:detail.name')}
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
            onChange={(event) => setEnergy(event.target.value)}
            required
          />
          <span className="muted">{t('ingredients:detail.energyHint')}</span>
        </label>
        <label className="field">
          {t('recipes:drawers.comment')}
          <textarea
            className="input"
            rows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        {ingredient ? (
          <div className="field">
            <span>{t('recipes:drawers.owner')}</span>
            <div className={styles.ownerRow}>
              <span>
                {groups.data?.find((group) => group.id === ingredient.ingredient.group_id)
                  ?.name ?? ingredient.ingredient.group_id}
              </span>
              {canManageGroup(ingredient.ingredient.group_id) && (
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

        <div className={styles.footer}>
          {ingredient && (
            <button
              type="button"
              className="btn btn--ghost"
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
            className="btn btn--primary"
            disabled={pending || !name.trim() || !energy.trim()}
          >
            {pending ? (
              <Spinner size="sm" />
            ) : ingredient ? (
             t('common:actions.save')
            ) : (
             t('recipes:drawers.create')
            )}
          </button>
        </div>
      </form>

      {ingredient && confirmDelete && (
        <ConfirmDialog
          title={t('ingredients:detail.deleteTitle')}
          message={
            usageCount > 0
              ?t('ingredients:detail.deleteUsagesWarning', {
                  name: ingredient.ingredient.name,
                  count: usageCount,
                })
              :t('ingredients:detail.deleteConfirm', { name: ingredient.ingredient.name })
          }
          pending={saving}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
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
    </Drawer>
  )
}

/** Nutzt mutations ungeachtet des create-Pfads — hält den Hook importiert. */