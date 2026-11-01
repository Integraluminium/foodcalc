import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/ui/Dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'
import {
  useRecipe,
  useRecipeMutations,
  useRecipes,
} from '../hooks/queries/useRecipes'
import {
  useGroups,
  useUnits,
} from '../hooks/queries/useMasterData'
import { useIngredients } from '../hooks/queries/useIngredients'
import { formatDecimal, formatKjPerG, toNumber } from '../lib/format'
import type { RecipeDetail, RecipeKind, RecipeStep } from '../api/types'
import type { RecipeStepInput } from '../api/endpoints/recipes'
import styles from './RecipeDetailPage.module.css'

export default function RecipeDetailPage() {
  const params = useParams()
  const recipeId = Number(params.recipeId)
  const recipe = useRecipe(recipeId)

  if (!Number.isFinite(recipeId) || recipeId <= 0) {
    return (
      <p className="secondary">
        Ungültige Rezept-ID. <Link to="/recipes">Zurück zur Liste</Link>
      </p>
    )
  }
  if (recipe.isPending) {
    return (
      <div className="full-page-center">
        <Spinner size="lg" />
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

  return <RecipeEditor recipe={recipe.data} />
}

function RecipeEditor({ recipe }: { recipe: RecipeDetail }) {
  const navigate = useNavigate()
  const groups = useGroups()
  const ingredients = useIngredients('')
  const units = useUnits()
  const recipes = useRecipes()
  const mutations = useRecipeMutations(recipe.id)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const groupName =
    groups.data?.find((group) => group.id === recipe.group_id)?.name ??
    `Gruppe ${recipe.group_id}`

  return (
    <div className={styles.page}>
      <Link to="/recipes" className="secondary">
        ← Recipes
      </Link>

      <div className={`card ${styles.header}`}>
        <div className={styles.headerMain}>
          <h1 className="section-title">{recipe.name}</h1>
          <div className={styles.badges}>
            <span
              className={`badge ${
                recipe.kind === 'meal' ? 'badge--success' : 'badge--info'
              }`}
            >
              {recipe.kind === 'meal' ? 'Gericht' : 'Komponente'}
            </span>
            <button
              type="button"
              className={`badge ${
                recipe.weighed_in ? 'badge--success' : 'badge--warning'
              }`}
              title="Umschalten: alle Mengen eingewogen und auf das Gramm genau?"
              onClick={() =>
                mutations.update.mutate({ weighed_in: !recipe.weighed_in })
              }
            >
              {recipe.weighed_in ? 'Eingewogen ✓' : 'Nicht eingewogen'}
            </button>
            <span className="badge badge--neutral">{groupName}</span>
          </div>
          {recipe.comment && <p className="muted">{recipe.comment}</p>}
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setEditOpen(true)}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              mutations.clone.mutate(undefined, {
                onSuccess: (created) => void navigate(`/recipes/${created.id}`),
              })
            }
            disabled={mutations.clone.isPending}
          >
            Klonen
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Löschen
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={`card ${styles.stat}`}>
          <span className="muted">Gesamtgewicht</span>
          <strong>
            {recipe.stats ? formatDecimal(recipe.stats.weight_kg) : '–'} kg
          </strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className="muted">Energie gesamt</span>
          <strong>
            {recipe.stats
              ? formatDecimal(recipe.stats.energy_kj, 0)
              : '–'}{' '}
            kJ
          </strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className="muted">Energie-Dichte</span>
          <strong>
            {recipe.stats ? formatKjPerG(recipe.stats.energy_kj_per_g) : '–'}
          </strong>
        </div>
      </div>
      <p className={`muted ${styles.hint}`}>
        Die Energie-Dichte skaliert die Menge: Portionen × Energie-Zielwert pro
        Portion bestimmen später die Kochmenge.
      </p>

      <IngredientsSection
        recipe={recipe}
        units={units.data ?? []}
        ingredients={ingredients.data ?? []}
        mutations={mutations}
      />
      <SubRecipesSection
        recipe={recipe}
        recipes={recipes.data ?? []}
        mutations={mutations}
      />
      <StepsSection recipe={recipe} mutations={mutations} />

      <div className={`card ${styles.properties}`}>
        <h2 className="section-subtitle">Eigenschaften &amp; Allergene</h2>
        {recipe.properties.length === 0 ? (
          <p className="muted">
            Ergibt sich aus den Zutaten (im Zutaten-Editor pflegbar).
          </p>
        ) : (
          <div className={styles.badges}>
            {recipe.properties.map((property) => (
              <span key={property.id} className="badge badge--neutral">
                {property.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {editOpen && <EditRecipeDialog recipe={recipe} onClose={() => setEditOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Rezept löschen"
          message={`„${recipe.name}" inklusive Zutaten, Schritten und Sub-Rezept-Zuordnungen wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: () => void navigate('/recipes'),
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </div>
  )
}

function EditRecipeDialog({
  recipe,
  onClose,
}: {
  recipe: RecipeDetail
  onClose: () => void
}) {
  const mutations = useRecipeMutations(recipe.id)
  const [kind, setKind] = useState<RecipeKind>(recipe.kind)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutations.update.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        comment: String(data.get('comment') ?? '').trim() || null,
        kind,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Rezept bearbeiten"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" form="edit-recipe-form" className="btn btn--primary">
            Speichern
          </button>
        </>
      }
    >
      <form id="edit-recipe-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            Name
            <input className="input" name="name" defaultValue={recipe.name} required />
          </label>
          <label className="field">
            Typ
            <select
              className="input"
              value={kind}
              onChange={(event) => setKind(event.target.value as RecipeKind)}
            >
              <option value="meal">Gericht</option>
              <option value="component">Komponente</option>
            </select>
          </label>
          <label className="field">
            Kommentar
            <input className="input" name="comment" defaultValue={recipe.comment ?? ''} />
          </label>
        </div>
      </form>
    </Dialog>
  )
}

type RecipeMutations = ReturnType<typeof useRecipeMutations>
type UnitOption = { id: number; name: string }
type IngredientOption = { id: number; name: string }

function IngredientsSection({
  recipe,
  units,
  ingredients,
  mutations,
}: {
  recipe: RecipeDetail
  units: UnitOption[]
  ingredients: IngredientOption[]
  mutations: RecipeMutations
}) {
  const [newIngredientId, setNewIngredientId] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newUnitId, setNewUnitId] = useState('')

  const handleAdd = () => {
    const ingredientId = Number(newIngredientId)
    if (!ingredientId || !newAmount || !newUnitId) return
    mutations.addIngredient.mutate(
      {
        ingredient_id: ingredientId,
        amount: newAmount,
        unit_id: Number(newUnitId),
      },
      {
        onSuccess: () => {
          setNewIngredientId('')
          setNewAmount('')
        },
      },
    )
  }

  return (
    <section className={`card ${styles.section}`}>
      <h2 className="section-subtitle">Zutaten</h2>
      {recipe.ingredients.length === 0 ? (
        <p className="muted">Noch keine Zutaten — unten hinzufügen.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Zutat</th>
              <th>Menge</th>
              <th>Einheit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ingredient) => {
              const amount = String(toNumber(ingredient.amount) ?? '')
              return (
                <tr key={ingredient.ingredient_id}>
                  <td>{ingredient.name ?? ingredient.ingredient_id}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      min="0"
                      key={`${ingredient.ingredient_id}-${ingredient.amount}`}
                      defaultValue={amount}
                      onBlur={(event) => {
                        if (event.target.value !== amount) {
                          mutations.updateIngredient.mutate({
                            ingredientId: ingredient.ingredient_id,
                            ingredient_id: ingredient.ingredient_id,
                            amount: event.target.value,
                            unit_id: ingredient.unit_id,
                          })
                        }
                      }}
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={ingredient.unit_id}
                      onChange={(event) =>
                        mutations.updateIngredient.mutate({
                          ingredientId: ingredient.ingredient_id,
                          ingredient_id: ingredient.ingredient_id,
                          amount: ingredient.amount,
                          unit_id: Number(event.target.value),
                        })
                      }
                    >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Zutat entfernen"
                      onClick={() =>
                        mutations.removeIngredient.mutate(ingredient.ingredient_id)
                      }
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <div className="form-row">
        <label className="field">
          Zutat
          <select
            className="input"
            value={newIngredientId}
            onChange={(event) => setNewIngredientId(event.target.value)}
          >
            <option value="">Auswählen…</option>
            {ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Menge
          <input
            className="input"
            type="number"
            step="any"
            min="0"
            value={newAmount}
            onChange={(event) => setNewAmount(event.target.value)}
          />
        </label>
        <label className="field">
          Einheit
          <select
            className="input"
            value={newUnitId}
            onChange={(event) => setNewUnitId(event.target.value)}
          >
            <option value="">Auswählen…</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleAdd}
          disabled={mutations.addIngredient.isPending}
        >
          Hinzufügen
        </button>
      </div>
    </section>
  )
}

function SubRecipesSection({
  recipe,
  recipes,
  mutations,
}: {
  recipe: RecipeDetail
  recipes: { id: number; name: string }[]
  mutations: RecipeMutations
}) {
  const [newChildId, setNewChildId] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const candidates = recipes.filter((candidate) => candidate.id !== recipe.id)

  const handleAdd = () => {
    const childId = Number(newChildId)
    if (!childId || !newWeight) return
    mutations.addSubRecipe.mutate(
      { child_recipe_id: childId, weight: newWeight },
      {
        onSuccess: () => {
          setNewChildId('')
          setNewWeight('')
        },
      },
    )
  }

  return (
    <section className={`card ${styles.section}`}>
      <h2 className="section-subtitle">Sub-Komponenten</h2>
      <p className="muted">
        Gerichte und Komponenten sind frei kombinierbar — eine Komponente als
        Beilage, ein Gericht als Beilage eines anderen Gerichts.
      </p>
      {recipe.sub_recipes.length === 0 ? (
        <p className="muted">Keine Sub-Komponenten.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Rezept</th>
              <th>Gewicht (kg)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recipe.sub_recipes.map((sub) => {
              const weight = String(toNumber(sub.weight) ?? '')
              return (
                <tr key={sub.recipe_id}>
                  <td>
                    <Link to={`/recipes/${sub.recipe_id}`}>{sub.name}</Link>
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      min="0"
                      key={`${sub.recipe_id}-${sub.weight}`}
                      defaultValue={weight}
                      onBlur={(event) => {
                        if (event.target.value !== weight) {
                          mutations.updateSubRecipe.mutate({
                            childId: sub.recipe_id,
                            weight: event.target.value,
                          })
                        }
                      }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Sub-Komponente entfernen"
                      onClick={() =>
                        mutations.removeSubRecipe.mutate(sub.recipe_id)
                      }
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <div className="form-row">
        <label className="field">
          Rezept
          <select
            className="input"
            value={newChildId}
            onChange={(event) => setNewChildId(event.target.value)}
          >
            <option value="">Auswählen…</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Gewicht (kg)
          <input
            className="input"
            type="number"
            step="any"
            min="0"
            value={newWeight}
            onChange={(event) => setNewWeight(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleAdd}
          disabled={mutations.addSubRecipe.isPending}
        >
          Hinzufügen
        </button>
      </div>
    </section>
  )
}

function StepsSection({
  recipe,
  mutations,
}: {
  recipe: RecipeDetail
  mutations: RecipeMutations
}) {
  const nextOrder = recipe.steps.length
    ? Math.max(...recipe.steps.map((step) => step.order)) + 1
    : 1

  return (
    <section className={`card ${styles.section}`}>
      <div className={styles.sectionHeader}>
        <h2 className="section-subtitle">Arbeitsschritte</h2>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() =>
            mutations.addStep.mutate({
              order: nextOrder,
              name: 'Neuer Schritt',
              description: '',
              fixed_duration_seconds: 0,
              duration_per_kg_seconds: 0,
            })
          }
          disabled={mutations.addStep.isPending}
        >
          + Schritt
        </button>
      </div>
      {recipe.steps.length === 0 ? (
        <p className="muted">Noch keine Arbeitsschritte.</p>
      ) : (
        <div className={styles.steps}>
          {recipe.steps.map((step) => (
            <StepRow key={step.id} step={step} mutations={mutations} />
          ))}
        </div>
      )}
    </section>
  )
}

function StepRow({
  step,
  mutations,
}: {
  step: RecipeStep
  mutations: RecipeMutations
}) {
  const commit = (patch: Partial<RecipeStepInput>) => {
    mutations.updateStep.mutate({
      stepId: step.id,
      order: step.order,
      name: patch.name ?? step.name,
      description: patch.description ?? step.description,
      fixed_duration_seconds:
        patch.fixed_duration_seconds ?? step.fixed_duration_seconds,
      duration_per_kg_seconds:
        patch.duration_per_kg_seconds ?? step.duration_per_kg_seconds,
    })
  }

  const fixedMinutes = String(Math.round(step.fixed_duration_seconds / 60))
  const perKgMinutes = String(Math.round(step.duration_per_kg_seconds / 60))

  return (
    <div className={styles.stepRow}>
      <span className={`badge badge--neutral ${styles.stepOrder}`}>
        #{Math.round(step.order)}
      </span>
      <div className={styles.stepFields}>
        <input
          className="input"
          key={`${step.id}-name-${step.name}`}
          defaultValue={step.name}
          onBlur={(event) => {
            if (event.target.value !== step.name)
              commit({ name: event.target.value })
          }}
        />
        <textarea
          className="input"
          rows={2}
          placeholder="Beschreibung…"
          key={`${step.id}-desc-${step.description}`}
          defaultValue={step.description}
          onBlur={(event) => {
            if (event.target.value !== step.description)
              commit({ description: event.target.value })
          }}
        />
        <div className={styles.stepMeta}>
          <label className="field">
            Dauer (min)
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              key={`${step.id}-fixed-${step.fixed_duration_seconds}`}
              defaultValue={fixedMinutes}
              onBlur={(event) => {
                const seconds = Math.round(Number(event.target.value) * 60)
                if (
                  Number.isFinite(seconds) &&
                  seconds !== step.fixed_duration_seconds
                )
                  commit({ fixed_duration_seconds: seconds })
              }}
            />
          </label>
          <label className="field">
            Dauer pro kg (min)
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              key={`${step.id}-perkg-${step.duration_per_kg_seconds}`}
              defaultValue={perKgMinutes}
              onBlur={(event) => {
                const seconds = Math.round(Number(event.target.value) * 60)
                if (
                  Number.isFinite(seconds) &&
                  seconds !== step.duration_per_kg_seconds
                )
                  commit({ duration_per_kg_seconds: seconds })
              }}
            />
          </label>
          <button
            type="button"
            className={styles.iconButton}
            title="Schritt löschen"
            onClick={() => mutations.removeStep.mutate(step.id)}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
