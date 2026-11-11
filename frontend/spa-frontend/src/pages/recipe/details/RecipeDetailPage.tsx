import { Link, useParams } from 'react-router-dom'
import { RecipeView } from '../view/RecipeView.tsx'

/**
 * Vollansicht eines Rezepts (Deep-Link) — rendert dieselbe geteilte
 * `RecipeView` wie der Hub-Drawer, nur full-page.
 */
export default function RecipeDetailPage() {
  const params = useParams()
  const recipeId = Number(params.recipeId)

  if (!Number.isFinite(recipeId) || recipeId <= 0) {
    return (
      <p className="secondary">
        Ungültige Rezept-ID. <Link to="/recipes">Zurück zur Liste</Link>
      </p>
    )
  }
  return <RecipeView recipeId={recipeId} variant="page" />
}
