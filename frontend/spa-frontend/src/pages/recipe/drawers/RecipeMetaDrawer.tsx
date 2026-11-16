import {useQueryClient} from '@tanstack/react-query'
import type {FormEvent} from 'react'
import {useState} from 'react'
import {useNavigate} from 'react-router'
import {recipesApi} from '../../../api/endpoints/recipes.ts'
import type {RecipeDetail} from '../../../api/types.ts'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {SegmentedControl} from '../../../components/ui/segmented_control/SegmentedControl.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useGroups} from '../../../hooks/queries/useMasterData.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import {t} from '../../../i18n'
import styles from './RecipeDrawers.module.css'

/**
 * Meta-Drawer des Rezepts — Basisdaten anlegen (Create) und bearbeiten.
 * Zutaten und Arbeitsschritte leben in eigenen Drawern der Detailseite.
 */
export function RecipeMetaDrawer({
  recipe,
  onClose,
}: {
  recipe: RecipeDetail | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groups = useGroups()
  const { canManageGroup } = usePermissions()

  const [name, setName] = useState(recipe?.name ?? '')
  const [kind, setKind] = useState<'meal' | 'component'>(recipe?.kind ?? 'meal')
  const [comment, setComment] = useState(recipe?.comment ?? '')
  const [weighedIn, setWeighedIn] = useState(recipe?.weighed_in ?? false)
  // 0 = noch nicht gesetzt → Create-Default (persönliche Gruppe) via Derivation.
  const [groupId, setGroupId] = useState(recipe?.group_id ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)


  const personalGroup = groups.data?.find((group) => group.is_personal)
  const effectiveGroupId =
    groupId || personalGroup?.id || groups.data?.[0]?.id || 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || effectiveGroupId === 0) return
    setSaving(true)
    setError(null)
    try {
      if (recipe) {
        await recipesApi.update(recipe.id, {
          name: name.trim(),
          kind,
          comment: comment.trim() || null,
          weighed_in: weighedIn,
        })
        void queryClient.invalidateQueries()
        onClose()
      } else {
        const created = await recipesApi.create({
          name: name.trim(),
          kind,
          comment: comment.trim() || null,
          group_id: effectiveGroupId,
        })
        void queryClient.invalidateQueries()
        onClose()
        void navigate(`/recipes/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('state.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!recipe) return
    setSaving(true)
    try {
      await recipesApi.remove(recipe.id)
      void queryClient.invalidateQueries()
      setConfirmDelete(false)
      onClose()
      void navigate('/recipes')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('state.error'))
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  const kindOptions = [
    { value: 'meal' as const, label: t('editor.drawer.kindMeal') },
    { value: 'component' as const, label: t('editor.drawer.kindComponent') },
  ]

  return (
    <Drawer title={t('editor.drawer.metaTitle')} onClose={onClose}>
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          {t('editor.drawer.name')}
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </label>
        <div className="field">
          <span>{t('editor.drawer.kind')}</span>
          <SegmentedControl options={[...kindOptions]} value={kind} onChange={setKind} ariaLabel={t('editor.drawer.kind')} />
        </div>
        <label className="field">
          {t('editor.drawer.comment')}
          <textarea className="input" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
        {recipe ? (
          <>
            <label className="field">
              <input type="checkbox" checked={weighedIn} onChange={(event) => setWeighedIn(event.target.checked)} />{' '}
              {t('editor.drawer.weighedIn')}
            </label>
            <div className="field">
              <span>{t('editor.drawer.owner')}</span>
              <div className={styles.ownerRow}>
                <span>
                  {groups.data?.find((group) => group.id === recipe.group_id)?.name ?? recipe.group_id}
                </span>
                {canManageGroup(recipe.group_id) && (
                  <button type="button" className="btn btn--ghost" onClick={() => setTransferOpen(true)}>
                    {t('transfer.open')}
                  </button>
                )}
              </div>
              <span className="muted">{t('editor.drawer.ownerHint')}</span>
            </div>
          </>
        ) : (
          <label className="field">
            {t('editor.drawer.owner')}
            {groups.isPending ? (
              <Spinner size="sm" />
            ) : (
              <select className="input" value={groupId} onChange={(event) => setGroupId(Number(event.target.value))}>
                {groups.data?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_personal ? ` (${t('editor.drawer.personal')})` : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        {error && <p className="secondary">{error}</p>}
        <div className={styles.footer}>
          {recipe && (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              {t('action.delete')}
            </button>
          )}
          <span className={styles.footerSpacer} />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || !name.trim() || effectiveGroupId === 0}>
            {saving ? <Spinner size="sm" /> : recipe ? t('action.save') : t('editor.drawer.create')}
          </button>
        </div>
      </form>
      {recipe && confirmDelete && (
        <ConfirmDialog
          title={t('editor.drawer.deleteTitle')}
          message={t('editor.drawer.deleteConfirm', { name: recipe.name })}
          pending={saving}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {recipe && transferOpen && (
        <OwnerTransferDialog
          kind="recipes"
          id={recipe.id}
          currentGroupId={recipe.group_id}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </Drawer>
  )
}
