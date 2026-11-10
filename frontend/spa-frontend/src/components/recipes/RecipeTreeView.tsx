import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDecimal } from '../../lib/format'
import type { RecipeTreeNode } from '../../api/types'
import styles from './RecipeTreeView.module.css'

/**
 * Collapsible recursion tree of a recipe: sub-recipes (SUB) with the
 * weight used by their parent and ingredients (ING) with base amounts.
 */
export function RecipeTreeView({ root }: { root: RecipeTreeNode }) {
  return (
    <div className={styles.tree}>
      <TreeNode node={root} depth={0} isRoot />
    </div>
  )
}

function TreeNode({
  node,
  depth,
  isRoot = false,
}: {
  node: RecipeTreeNode
  depth: number
  isRoot?: boolean
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasContent = node.ingredients.length > 0 || node.children.length > 0

  return (
    <div className={styles.node} style={{ ['--depth' as string]: depth }}>
      <div className={styles.row}>
        {hasContent ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.toggleSpacer} />
        )}
        <Link
          to={`/recipes/${node.recipe_id}`}
          className={`${styles.name} ${isRoot ? styles.rootName : ''}`}
        >
          {node.name}
        </Link>
        {isRoot ? (
          <span className={styles.badgeRoot}>
            {node.kind === 'meal' ? 'GERICHT' : 'KOMPONENTE'}
          </span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeSub}`}>SUB</span>
        )}
        <span className={styles.amount}>
          {node.weight !== null ? `${formatDecimal(node.weight)} kg` : ''}
        </span>
      </div>

      {expanded && (
        <div className={styles.children}>
          {node.ingredients.map((ingredient) => (
            <div
              key={`${ingredient.ingredient_id}-${ingredient.unit_id}`}
              className={styles.row}
            >
              <span className={styles.toggleSpacer} />
              <span className={styles.leafDot}>•</span>
              <span className={styles.leafName}>
                {ingredient.name ?? `Zutat #${ingredient.ingredient_id}`}
              </span>
              <span className={`${styles.badge} ${styles.badgeIng}`}>ING</span>
              <span className={styles.amount}>
                {formatDecimal(ingredient.amount)}
                {ingredient.unit_name ? ` ${ingredient.unit_name}` : ''}
                {ingredient.weight !== null && (
                  <span className={styles.weightHint}>
                    {' '}
                    ({formatDecimal(ingredient.weight)} kg)
                  </span>
                )}
              </span>
            </div>
          ))}
          {node.children.map((child) => (
            <TreeNode key={`${child.recipe_id}-${node.recipe_id}`} node={child} depth={depth + 1} />
          ))}
          {!hasContent && <p className={styles.empty}>Keine Zutaten hinterlegt.</p>}
        </div>
      )}
    </div>
  )
}
