import { Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { RecipeView } from '../view/RecipeView.tsx'
import { RecipeMetaDrawer } from '../drawers/RecipeMetaDrawer.tsx'

/**
 * Vollansicht eines Rezepts (Deep-Link) — rendert dieselbe geteilte
 * `RecipeView` wie der Hub-Drawer, nur full-page. `new` öffnet sofort den
 * Meta-Drawer (Create); nach dem Anlegen landet man hier auf der Seite.
 */
export default function RecipeDetailPage() {
  const params = useParams()
  const recipeId = Number(params.recipeId)

  if (params.recipeId === 'new') {
    return <RecipeCreateAnchor />
  }
  if (!Number.isFinite(recipeId) || recipeId <= 0) {
    return (
      <p className="secondary">
        Ungültige Rezept-ID. <Link to="/recipes">Zurück zur Liste</Link>
      </p>
    )
  }
  return <RecipeView recipeId={recipeId} variant="page" />
}

function RecipeCreateAnchor() {
  const navigate = useNavigate()
  return <RecipeMetaDrawer recipe={null} onClose={() => void navigate('/recipes')} />
}

/** Alte Edit-Route: leitet auf die Detailseite weiter (Drawers dort). */
export function RecipeEditRedirect() {
  const params = useParams()
  const recipeId = Number(params.recipeId)
  return (
    <Navigate
      to={Number.isFinite(recipeId) ? `/recipes/${recipeId}` : '/recipes'}
      replace
    />
  )
}
