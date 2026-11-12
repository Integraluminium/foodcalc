import {useQueryClient} from '@tanstack/react-query'
import {useReducer, useState} from 'react'
import {recipesApi} from '../../../api/endpoints/recipes.ts'
import type {RecipeDetail} from '../../../api/types.ts'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useRecipe} from '../../../hooks/queries/useRecipes.ts'
import {t} from '../../../i18n'
import {draftFromDetail, reducer} from '../edit/editorModel.ts'
import styles from './RecipeDrawers.module.css'

/** Arbeitsschritte-Drawer der Rezept-Detailseite. */
export function RecipeStepsDrawer({
  recipeId,
  onClose,
}: {
  recipeId: number
  onClose: () => void
}) {
  const detailQuery = useRecipe(recipeId)

  if (!detailQuery.data) {
    return (
      <Drawer title={t('editor.drawer.stepsTitle')} onClose={onClose}>
        {detailQuery.isError ? (
          <p className="secondary">{String(detailQuery.error)}</p>
        ) : (
          <Spinner />
        )}
      </Drawer>
    )
  }
  return (
    <StepsEditor key={recipeId} detail={detailQuery.data} recipeId={recipeId} onClose={onClose} />
  )
}

function StepsEditor({
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(original)

  const commit = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const row of draft.steps) {
        if (row.existingId === undefined) {
          await recipesApi.addStep(recipeId, {
            order: draft.steps.indexOf(row),
            name: row.name,
            description: row.description,
            fixed_duration_seconds: row.fixedSeconds,
            duration_per_kg_seconds: row.perKgSeconds,
          })
        }
      }
      const kept = new Set(
        draft.steps.map((row) => row.existingId).filter((id): id is number => id !== undefined),
      )
      for (const row of detail.steps) {
        if (!kept.has(row.id)) {
          await recipesApi.removeStep(recipeId, row.id)
        }
      }
      for (const row of draft.steps) {
        if (row.existingId !== undefined) {
          await recipesApi.updateStep(recipeId, row.existingId, {
            order: draft.steps.indexOf(row),
            name: row.name,
            description: row.description,
            fixed_duration_seconds: row.fixedSeconds,
            duration_per_kg_seconds: row.perKgSeconds,
          })
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
      title={t('editor.drawer.stepsTitle')}
      onClose={() => (dirty ? setConfirmCancel(true) : onClose())}
      footer={footer}
    >
      <div className={styles.stepList}>
        {draft.steps.length === 0 && (
          <p className="muted">{t('editor.drawer.stepsEmpty')}</p>
        )}
        {draft.steps.map((row, index) => (
          <div key={row.existingId ?? `new-${index}`} className={styles.stepCard}>
            <div className={styles.stepHead}>
              <span className={styles.stepNum}>{index + 1}</span>
              <input
                className="input"
                value={row.name}
                onChange={(event) =>
                  dispatch({ type: 'update-step', index, patch: { name: event.target.value } })
                }
              />
              <label className={styles.stepDur}>
                <span>{t('editor.drawer.colFixed')}</span>
                <input
                  className={`input ${styles.minInput}`}
                  inputMode="decimal"
                  type="number"
                  value={row.fixedSeconds === 0 ? '' : String(row.fixedSeconds / 60)}
                  onChange={(event) =>
                    dispatch({
                      type: 'update-step',
                      index,
                      patch: { fixedSeconds: Math.round((Number(event.target.value) || 0) * 60) },
                    })
                  }
                />
              </label>
              <label className={styles.stepDur}>
                <span>{t('editor.drawer.colPerKg')}</span>
                <input
                  className={`input ${styles.minInput}`}
                  inputMode="decimal"
                  type="number"
                  value={row.perKgSeconds === 0 ? '' : String(row.perKgSeconds / 60)}
                  onChange={(event) =>
                    dispatch({
                      type: 'update-step',
                      index,
                      patch: { perKgSeconds: Math.round((Number(event.target.value) || 0) * 60) },
                    })
                  }
                />
              </label>
            </div>
            <textarea
              className={`input ${styles.stepDesc}`}
              rows={2}
              value={row.description}
              onChange={(event) =>
                dispatch({
                  type: 'update-step',
                  index,
                  patch: { description: event.target.value },
                })
              }
            />
            <div className={styles.rowActions}>
              <button
                type="button"
                className="btn btn--ghost"
                title={t('editor.drawer.moveUp')}
                disabled={index === 0}
                onClick={() => dispatch({ type: 'move-step', index, direction: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                title={t('editor.drawer.moveDown')}
                disabled={index === draft.steps.length - 1}
                onClick={() => dispatch({ type: 'move-step', index, direction: 1 })}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                title={t('action.delete')}
                onClick={() => dispatch({ type: 'remove-step', index })}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.addRow}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'add-step' })}
        >
          {t('editor.drawer.addStep')}
        </button>
      </div>

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
