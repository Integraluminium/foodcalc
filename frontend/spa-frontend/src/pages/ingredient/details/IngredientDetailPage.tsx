import {useTranslation} from 'react-i18next'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {CardSection} from '../../../components/patterns/card_section/CardSection.tsx'
import {IngredientDataDrawer} from '../drawers/IngredientDataDrawer.tsx'
import styles from '../view/IngredientView.module.css'
import {IngredientView} from '../view/IngredientView.tsx'

export default function IngredientDetailPage() {
  const { t } = useTranslation([])
  const params = useParams()
  const ingredientId = Number(params.ingredientId)

  if (params.ingredientId === 'new') {
    return <CreateAnchor />
  }
  if (!Number.isFinite(ingredientId) || ingredientId <= 0) {
    return (
      <div className={styles.page}>
        <CardSection title={t('common:state.error')}>
          <p className="secondary">
            Ungültige Zutat-ID. <Link to="/ingredients">Zurück zur Liste</Link>
          </p>
        </CardSection>
      </div>
    )
  }
  return <IngredientView ingredientId={ingredientId} variant="page" />
}

function CreateAnchor() {
  const navigate = useNavigate()
  return (
    <IngredientDataDrawer
      ingredient={null}
      onClose={() => void navigate('/ingredients')}
    />
  )
}