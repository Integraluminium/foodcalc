import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RecipeDetail } from '../../api/types'
import { useGroups } from '../../hooks/queries/useMasterData'
import {
  useRecipe,
  useRecipeMutations,
  useRecipeTree,
} from '../../hooks/queries/useRecipes'
import { usePermissions } from '../../hooks/usePermissions'
import { t } from '../../i18n'
import { ExportButton } from '../ui/ExportButton'
import { formatDecimal, formatKjPerG, formatMinutes } from '../../lib/format'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import styles from './RecipeView.module.css'
import { RecipeTreeView } from './RecipeTreeView'

export type RecipeViewVariant = 'overlay' | 'page'

interface RecipeViewProps {
  recipeId: number
  /** `overlay` = Hub-Drawer, `page` = eigene Route (Deep-Link). */
  variant: RecipeViewVariant
  /** Overlay: wird nach erfolgreichem Löschen aufgerufen (Drawer schließen). */
  onDeleted?: () => void
}

/**
 * Geteilte, rein lesende Rezeptansicht (UI_Spec §3.3): Identity-Header mit
 * Diagnose-Metriken, kollabierbarer Kompositionsbaum, sequenzielle Schritte.
 * Wird im Hub-Drawer (variant="overlay") und auf der Route /recipes/:id
 * (variant="page") gerendert — kein duplizierter Code. Bearbeiten läuft
 * ausschließlich über den Wizard.
 */
export function RecipeView({ recipeId, variant, onDeleted }: RecipeViewProps) {
  const recipe = useRecipe(recipeId)

  if (recipe.isPending) {
    return (
      <div className={styles.center}>
        <Spinner />
      </div>
    )
  }
  if (recipe.isError || !recipe.data) {
    return (
      <p className="secondary">
        Rezept konnte nicht geladen werden: {String(recipe.error)}
      </p>
    )
  }
  return (
    <RecipeViewContent
      recipe={recipe.data}
      variant={variant}
      onDeleted={onDeleted}
    />
  )
}

function RecipeViewContent({
  recipe,
  variant,
  onDeleted,
}: {
  recipe: RecipeDetail
  variant: RecipeViewVariant
  onDeleted?: () => void
}) {
  const navigate = useNavigate()
  const groups = useGroups()
  const tree = useRecipeTree(recipe.id)
  const mutations = useRecipeMutations(recipe.id)
  const { canEditGroup } = usePermissions()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editable = canEditGroup(recipe.group_id)
  const groupName =
    groups.data?.find((group) => group.id === recipe.group_id)?.name ??
    `Gruppe ${recipe.group_id}`
  const isPage = variant === 'page'

  return (
    <div className={isPage ? styles.page : styles.overlayBody}>
      {isPage && (
        <Link to="/recipes" className="secondary">
          ← {t('nav.recipes')}
        </Link>
      )}

      <div className={`card ${styles.header}`}>
        <div className={styles.headerMain}>
          <h1 className="section-title">{recipe.name}</h1>
          <div className={styles.badges}>
            <span
              className={`badge ${
                recipe.kind === 'meal' ? 'badge--success' : 'badge--info'
              }`}
            >
              {recipe.kind === 'meal'
                ? t('recipe.kind.meal')
                : t('recipe.kind.component')}
            </span>
            <span
              className={`badge ${recipe.weighed_in ? 'badge--success' : 'badge--warning'}`}
              title={
                recipe.weighed_in
                  ? t('mealDrawer.weighedHint')
                  : t('plan.notWeighedHint')
              }
            >
              {recipe.weighed_in
                ? t('mealDrawer.weighed')
                : t('mealDrawer.notWeighed')}
            </span>
            <span className="badge badge--neutral">{groupName}</span>
          </div>
          {recipe.comment && <p className="muted">{recipe.comment}</p>}
        </div>
        <div className={styles.headerActions}>
          <ExportButton
            path={`/recipes/${recipe.id}/export`}
            filename={`${recipe.name}.pdf`}
            title={t('recipe.pdfHint')}
          >
            {t('recipe.pdf')}
          </ExportButton>
          {editable && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void navigate(`/recipes/${recipe.id}/edit`)}
            >
              {t('action.edit')}
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                mutations.clone.mutate(undefined, {
                  onSuccess: (created) =>
                    void navigate(`/recipes/${created.id}`),
                })
              }
              disabled={mutations.clone.isPending}
            >
              {t('recipe.clone')}
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
        <Link to={`/recipes/${recipe.id}`} className="secondary">
          Vollansicht öffnen →
        </Link>
      )}

      <div className={styles.stats}>
        <div className={`card ${styles.stat}`}>
          <span className="muted">{t('recipe.totalWeight')}</span>
          <strong>
            {recipe.stats ? formatDecimal(recipe.stats.weight_kg) : '–'} kg
          </strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className="muted">{t('recipe.totalEnergy')}</span>
          <strong>
            {recipe.stats ? formatDecimal(recipe.stats.energy_kj, 0) : '–'} kJ
          </strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className="muted">{t('recipe.energyDensity')}</span>
          <strong>
            {recipe.stats ? formatKjPerG(recipe.stats.energy_kj_per_g) : '–'}
          </strong>
        </div>
      </div>
      <p className={`muted ${styles.hint}`}>
        Die Energie-Dichte skaliert die Menge: Portionen × Energie-Zielwert pro
        Portion bestimmen später die Kochmenge.
      </p>

      <section className={`card ${styles.section}`}>
        <h2 className="section-subtitle">{t('recipe.tree')}</h2>
        {tree.isPending ? (
          <Spinner size="sm" />
        ) : tree.isError ? (
          <p className="muted">
            Baum konnte nicht geladen werden: {String(tree.error)}
          </p>
        ) : tree.data.ingredients.length === 0 &&
          tree.data.children.length === 0 ? (
          <p className="muted">
            Noch keine Zutaten oder Sub-Komponenten hinterlegt — im Wizard
            bearbeiten.
          </p>
        ) : (
          <RecipeTreeView root={tree.data} />
        )}
      </section>

      <section className={`card ${styles.section}`}>
        <h2 className="section-subtitle">{t('recipe.steps')}</h2>
        {recipe.steps.length === 0 ? (
          <p className="muted">{t('recipe.noSteps')}</p>
        ) : (
          <div className={styles.steps}>
            {recipe.steps.map((step) => (
              <div key={step.id} className={styles.stepRow}>
                <span className={`badge badge--neutral ${styles.stepOrder}`}>
                  #{Math.round(step.order)}
                </span>
                <div className={styles.stepFields}>
                  <strong>{step.name || 'Schritt'}</strong>
                  {step.description && (
                    <p className="secondary">{step.description}</p>
                  )}
                  <span className="muted">
                    {formatMinutes(step.fixed_duration_seconds)}
                    {' · '}
                    {formatMinutes(step.duration_per_kg_seconds)}/kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {recipe.properties.length > 0 && (
        <section className={`card ${styles.section}`}>
          <h2 className="section-subtitle">{t('recipe.properties')}</h2>
          <div className={styles.chips}>
            {recipe.properties.map((property) => (
              <span key={property.id} className="badge badge--warning">
                {property.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('recipe.deleteTitle')}
          message={t('recipe.deleteMessage', { name: recipe.name })}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: () => {
                setConfirmDelete(false)
                if (!isPage) onDeleted?.()
                else void navigate('/recipes')
              },
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </div>
  )
}
