import {type ReactNode, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import type {RecipeDetail} from '../../../api'
import CardSection from "../../../components/patterns/card_section/CardSection.tsx";
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {EntityHeader, type StatItem} from "../../../components/patterns/entity_header/EntityHeader.tsx";
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {Badge, type BadgeItem} from "../../../components/ui/badge/Badge.tsx";
import {ExportButton} from "../../../components/ui/button/ExportButton.tsx";
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useGroups} from '../../../hooks/queries/useMasterData.ts'
import {useRecipe, useRecipeMutations, useRecipeTree,} from '../../../hooks/queries/useRecipes.ts'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import {t} from '../../../i18n'
import {formatDecimal, formatKjPerG, formatMinutes} from '../../../lib/format.ts'
import {RecipeIngredientsDrawer} from '../drawers/RecipeIngredientsDrawer.tsx'
import {RecipeMetaDrawer} from '../drawers/RecipeMetaDrawer.tsx'
import {RecipeStepsDrawer} from '../drawers/RecipeStepsDrawer.tsx'
import {RecipeTreeView} from '../tree_view/RecipeTreeView.tsx'
import styles from './RecipeView.module.css'

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

function buildRecipeBadges(isMeal: boolean, recipe: RecipeDetail, groupName: string): BadgeItem[] {
  return [
    {
      variant: isMeal ? 'success' : 'info',
      children: isMeal ? t('recipe.kind.meal') : t('recipe.kind.component'),
    },
    {
      variant: recipe.weighed_in ? 'success' : 'warning',
      label: recipe.weighed_in
        ? t('mealDrawer.weighedHint')
        : t('plan.notWeighedHint'),
      children: recipe.weighed_in
        ? t('mealDrawer.weighed')
        : t('mealDrawer.notWeighed'),
    },
    {
      variant: 'neutral',
      children: "owner: " + groupName,
    },
  ];
}

function buildStatsData(recipe: RecipeDetail): StatItem[] {
  return [
    {
      key: 'weight',
      label: t('recipe.totalWeight'),
      stats: recipe.stats ? `${formatDecimal(recipe.stats.weight_kg)} kg` : '– kg',
    },
    {
      key: 'energy',
      label: t('recipe.totalEnergy'),
      stats: recipe.stats ? `${formatDecimal(recipe.stats.energy_kj, 0)} kJ` : '– kJ',
    },
    {
      key: 'density',
      label: t('recipe.energyDensity'),
      stats: recipe.stats ? formatKjPerG(recipe.stats.energy_kj_per_g) : '–',
    },
  ];
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
  const { canViewGroup, canEditGroup, canManageGroup } = usePermissions()
  const { data: user } = useCurrentUser()
  const personalGroupId =
    user?.groups.find((group) => group.is_personal)?.id ??
    user?.groups[0]?.id ??
    0
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [drawer, setDrawer] = useState<'meta' | 'ingredients' | 'steps' | null>(null)

  const editable = canEditGroup(recipe.group_id)
  const groupName =
    groups.data?.find((group) => group.id === recipe.group_id)?.name ??
    `Gruppe ${recipe.group_id}`
  const isPage = variant === 'page'
  const isMeal = recipe.kind === 'meal';

  const closeDrawer = () => setDrawer(null);

  const drawers: Record<NonNullable<typeof drawer>, ReactNode> = {
    meta: <RecipeMetaDrawer recipe={recipe} onClose={closeDrawer} />,
    ingredients: <RecipeIngredientsDrawer recipeId={recipe.id} onClose={closeDrawer} />,
    steps: <RecipeStepsDrawer recipeId={recipe.id} onClose={closeDrawer} />,
  };

  const badgeItems: BadgeItem[] = buildRecipeBadges(isMeal, recipe, groupName);

  const statsData: StatItem[] = buildStatsData(recipe);

  const actions = (
    <>
      <ExportButton
        path={`/recipes/${recipe.id}/export`}
        filename={`${recipe.name}.pdf`}
        title={t('recipe.pdfHint')}
      >
        {t('recipe.pdf')}
      </ExportButton>
      {canManageGroup(recipe.group_id) && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setTransferOpen(true)}
        >
          {t('transfer.button')}
        </button>
      )}
      {editable && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setDrawer('meta')}
        >
          {t('editor.drawer.triggerMeta')}
        </button>
      )}
      {canViewGroup(recipe.group_id) && (
        <button
          type="button"
          className="btn btn--ghost"
          title={t('recipe.cloneHint')}
          onClick={() =>
            mutations.clone.mutate({ group_id: personalGroupId }, {
              onSuccess: (created) =>
                void navigate(`/recipes/${created.id}`),
            })
          }
          disabled={mutations.clone.isPending || personalGroupId === 0}
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
    </>
  )

  return (
    <div className={isPage ? styles.page : styles.overlayBody}>
      {isPage && (
        <Link to="/recipes" className="secondary">
          ← {t('nav.recipes')}
        </Link>
      )}




      <EntityHeader actions={actions} badges={badgeItems} stats={statsData} comment={recipe.comment}/>

      {!isPage && (
        <Link to={`/recipes/${recipe.id}`} className="secondary">
          Vollansicht öffnen →
        </Link>
      )}

      <p className={`muted ${styles.hint}`}>
        Die Energie-Dichte skaliert die Menge: Portionen × Energie-Zielwert pro
        Portion bestimmen später die Kochmenge.
      </p>

      <CardSection
        title={t('recipe.tree')}
        action={
          editable
            ? { label: t('editor.drawer.triggerIngredients'), onClick: () => setDrawer('ingredients') }
            : undefined
        }
      >{tree.isPending ? (
        <Spinner size="sm" />
      ) : tree.isError ? (
        <p className="muted">Baum konnte nicht geladen werden: {String(tree.error)}</p>
      ) : tree.data.ingredients.length === 0 && tree.data.children.length === 0 ? (
        <p className="muted">
          Noch keine Zutaten oder Sub-Komponenten hinterlegt — im Wizard bearbeiten.
        </p>
      ) : (
        <RecipeTreeView root={tree.data} />
      )}
      </CardSection>

      <CardSection
        title={t('recipe.steps')}
        action={
          editable
            ? { label: t('editor.drawer.triggerSteps'), onClick: () => setDrawer('steps') }
            : undefined
        }
      >
        {recipe.steps.length === 0 ? (
          <p className="muted">{t('recipe.noSteps')}</p>
        ) : (
          <div className={styles.steps}>
            {recipe.steps.map((step) => (
              <div key={step.id} className={styles.stepRow}>
                <Badge key={step.id} variant="neutral" className={styles.stepOrder}> #{Math.round(step.order)} </Badge>
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
      </CardSection>

      {recipe.properties.length > 0 && (
        <CardSection title={t('recipe.properties')}>
          <div className={styles.chips}>
            {recipe.properties.map((property) => (
              <Badge key={property.id} variant="info">
                {property.name}
              </Badge>
            ))}
          </div>
        </CardSection>
      )}
      {transferOpen && (
        <OwnerTransferDialog
          kind="recipes"
          id={recipe.id}
          currentGroupId={recipe.group_id}
          onClose={() => setTransferOpen(false)}
        />
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

      {drawer && drawers[drawer]}
    </div>
  )
}

