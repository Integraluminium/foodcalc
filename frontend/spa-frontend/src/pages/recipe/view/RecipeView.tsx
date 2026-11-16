import {t} from "i18next";
import {ArrowLeft, Copy, Pencil, Printer, Trash2} from 'lucide-react'
import {type ReactNode, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import type {RecipeDetail} from '../../../api'
import {CardSection} from '../../../components/patterns/card_section/CardSection.tsx'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {EntityHeader, type StatItem} from '../../../components/patterns/entity_header/EntityHeader.tsx'
import {OwnerTransferDialog} from '../../../components/patterns/owner_transfer/OwnerTransferDialog.tsx'
import {SkeletonCards} from '../../../components/patterns/skeleton/Skeleton.tsx'
import {ErrorState} from '../../../components/patterns/state_views/StateViews.tsx'
import {Badge, type BadgeProps} from '../../../components/ui/badge/Badge.tsx'
import {ExportButton} from '../../../components/ui/button/ExportButton.tsx'
import {useGroupName} from '../../../hooks/queries/useGroupName.ts'
import {useRecipe, useRecipeMutations, useRecipeTree} from '../../../hooks/queries/useRecipes.ts'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import {usePermissions} from '../../../hooks/usePermissions.ts'
import {formatDecimal, formatKjPerG, formatMinutes} from '../../../lib/format.ts'
import {RecipeIngredientsDrawer} from '../drawers/RecipeIngredientsDrawer.tsx'
import {RecipeMetaDrawer} from '../drawers/RecipeMetaDrawer.tsx'
import {RecipeStepsDrawer} from '../drawers/RecipeStepsDrawer.tsx'
import {RecipeTreeView} from '../tree_view/RecipeTreeView.tsx'
import styles from './RecipeView.module.css'

export type RecipeViewVariant = 'overlay' | 'page'

interface RecipeViewProps {
  recipeId: number
  variant: RecipeViewVariant
  onDeleted?: () => void
}

export function RecipeView({ recipeId, variant, onDeleted }: RecipeViewProps) {
  const recipe = useRecipe(recipeId)
  const isPage = variant === 'page'
  const containerClass = isPage ? styles.page : styles.overlayBody

  if (recipe.isPending) {
    return (
      <div className={containerClass}>
        {isPage && (
          <Link to="/recipes" className="secondary">
            <ArrowLeft size={14} /> {t('nav:recipes')}
          </Link>
        )}
        <EntityHeader isPending title="" />
        <SkeletonCards count={2} />
      </div>
    )
  }

  if (recipe.isError || !recipe.data) {
    return (
      <div className={containerClass}>
        <ErrorState message={t('recipes:detail.loadError', { error: String(recipe.error) })} />
      </div>
    )
  }

  return <RecipeViewContent recipe={recipe.data} variant={variant} onDeleted={onDeleted} />
}

function buildRecipeBadges(recipe: RecipeDetail, groupName: string): BadgeProps[] {
  const isMeal = recipe.kind === 'meal'
  return [
    {
      variant: isMeal ? 'success' : 'info',
      children: isMeal ? t('recipes:detail.kind.meal') : t('recipes:detail.kind.component'),
    },
    {
      variant: recipe.weighed_in ? 'success' : 'warning',
      title: recipe.weighed_in ? t('events:mealDrawer.weighedHint') : t('events:plan.notWeighedHint'),
      children: recipe.weighed_in ? t('events:mealDrawer.weighed') : t('events:mealDrawer.notWeighed'),
    },
    {
      variant: 'neutral',
      children: `${t('recipes:drawers.owner')}: ${groupName}`,
    },
  ]
}

function buildStatsData(recipe: RecipeDetail): StatItem[] {
  return [
    {
      key: 'weight',
      label: t('recipes:detail.totalWeight'),
      stats: recipe.stats ? `${formatDecimal(recipe.stats.weight_kg)} kg` : '— kg',
    },
    {
      key: 'energy',
      label: t('recipes:detail.totalEnergy'),
      stats: recipe.stats ? `${formatDecimal(recipe.stats.energy_kj, 0)} kJ` : '— kJ',
    },
    {
      key: 'density',
      label: t('recipes:detail.energyDensity'),
      stats: recipe.stats ? formatKjPerG(recipe.stats.energy_kj_per_g) : '—',
    },
  ]
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
  const groupName = useGroupName()
  const tree = useRecipeTree(recipe.id)
  const mutations = useRecipeMutations(recipe.id)
  const { canViewGroup, canEditGroup, canManageGroup } = usePermissions()
  const { data: user } = useCurrentUser()

  const personalGroupId =
    user?.groups.find((group) => group.is_personal)?.id ?? user?.groups[0]?.id ?? 0

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [drawer, setDrawer] = useState<'meta' | 'ingredients' | 'steps' | null>(null)

  const editable = canEditGroup(recipe.group_id)
  const isPage = variant === 'page'
  const closeDrawer = () => setDrawer(null)

  const drawers: Record<NonNullable<typeof drawer>, ReactNode> = {
    meta: <RecipeMetaDrawer recipe={recipe} onClose={closeDrawer} />,
    ingredients: <RecipeIngredientsDrawer recipeId={recipe.id} onClose={closeDrawer} />,
    steps: <RecipeStepsDrawer recipeId={recipe.id} onClose={closeDrawer} />,
  }

  const actions = (
    <>
      <ExportButton
        path={`/recipes/${recipe.id}/export`}
        filename={`${recipe.name}.pdf`}
        title={t('recipes:detail.pdfHint')}
      >
        <Printer size={14} /> {t('recipes:detail.pdf')}
      </ExportButton>
      {canManageGroup(recipe.group_id) && (
        <button type="button" className="btn btn--ghost" onClick={() => setTransferOpen(true)}>
          {t('common:transfer.button')}
        </button>
      )}
      {editable && (
        <button type="button" className="btn btn--ghost" onClick={() => setDrawer('meta')}>
          <Pencil size={14} /> {t('recipes:drawers.triggerMeta')}
        </button>
      )}
      {canViewGroup(recipe.group_id) && (
        <button
          type="button"
          className="btn btn--ghost"
          title={t('recipes:detail.cloneHint')}
          onClick={() =>
            mutations.clone.mutate(
              { group_id: personalGroupId },
              { onSuccess: (created) => void navigate(`/recipes/${created.id}`) },
            )
          }
          disabled={mutations.clone.isPending || personalGroupId === 0}
        >
          <Copy size={14} /> {t('recipes:detail.clone')}
        </button>
      )}
      {editable && (
        <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={14} /> {t('common:actions.delete')}
        </button>
      )}
    </>
  )

  return (
    <div className={isPage ? styles.page : styles.overlayBody}>
      {isPage && (
        <Link to="/recipes" className="secondary">
          <ArrowLeft size={14} /> {t('nav:recipes')}
        </Link>
      )}

      <EntityHeader
        title={isPage ? recipe.name : undefined}
        actions={actions}
        badges={buildRecipeBadges(recipe, groupName(recipe.group_id))}
        stats={buildStatsData(recipe)}
        comment={recipe.comment}
      />

      {!isPage && (
        <Link to={`/recipes/${recipe.id}`} className="secondary">
          {t('recipes:detail.openFullView')}
        </Link>
      )}

      <p className={`muted ${styles.hint}`}>{t('recipes:detail.scalingHint')}</p>

      <CardSection
        title={t('recipes:detail.tree')}
        actions={
          editable && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setDrawer('ingredients')}
            >
              <Pencil size={14} /> {t('recipes:drawers.triggerIngredients')}
            </button>
          )
        }
      >
        {tree.isPending ? (
          <SkeletonCards count={1} />
        ) : tree.isError ? (
          <ErrorState message={t('recipes:detail.treeLoadError', { error: String(tree.error) })} />
        ) : tree.data.ingredients.length === 0 && tree.data.children.length === 0 ? (
          <p className="muted">{t('recipes:detail.treeEmpty')}</p>
        ) : (
          <RecipeTreeView root={tree.data} />
        )}
      </CardSection>

      <CardSection
        title={t('recipes:detail.steps')}
        actions={
          editable && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setDrawer('steps')}
            >
              <Pencil size={14} /> {t('recipes:drawers.triggerSteps')}
            </button>
          )
        }
      >
        {recipe.steps.length === 0 ? (
          <p className="muted">{t('recipes:detail.noSteps')}</p>
        ) : (
          <div className={styles.steps}>
            {recipe.steps.map((step) => (
              <div key={step.id} className={styles.stepRow}>
                <Badge variant="neutral" className={styles.stepOrder}>
                  #{Math.round(step.order)}
                </Badge>
                <div className={styles.stepFields}>
                  <div className={styles.chips}>
                    <strong>{step.name || t('recipes:detail.stepFallback')}</strong>
                    {step.is_haccp && <Badge variant="warning">HACCP</Badge>}
                  </div>
                  {step.description && <p className="secondary">{step.description}</p>}
                  <span className="muted">
                    {formatMinutes(step.fixed_duration_seconds)} +{' '}
                    {formatMinutes(step.duration_per_kg_seconds)}/kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {recipe.properties.length > 0 && (
        <CardSection title={t('recipes:detail.properties')}>
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
          title={t('recipes:detail.deleteTitle')}
          message={t('recipes:detail.deleteMessage', { name: recipe.name })}
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