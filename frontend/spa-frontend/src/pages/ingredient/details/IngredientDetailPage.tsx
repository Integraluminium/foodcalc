import { Link, useNavigate, useParams } from 'react-router-dom'
import { IngredientDataDrawer } from '../drawers/IngredientDataDrawer.tsx'
import { IngredientView } from '../view/IngredientView.tsx'

/**
 * Zutaten-Vollansicht (Deep-Link) — dieselbe geteilte `IngredientView` wie
 * der Hub-Drawer. `new` öffnet sofort den Stammdaten-Drawer (Create).
 */
export default function IngredientDetailPage() {
  const params = useParams()
  const ingredientId = Number(params.ingredientId)

  if (params.ingredientId === 'new') {
    return <CreateAnchor />
  }
  if (!Number.isFinite(ingredientId) || ingredientId <= 0) {
    return (
      <p className="secondary">
        Ungültige Zutat-ID. <Link to="/ingredients">Zurück zur Liste</Link>
      </p>
    )
  }
  return <IngredientView ingredientId={ingredientId} variant="page" />
}

function CreateAnchor() {
  const navigate = useNavigate()
  return (
    <IngredientDataDrawer ingredient={null} onClose={() => void navigate('/ingredients')} />
  )
}
