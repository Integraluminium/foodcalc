/**
 * DTO types mirroring the backend's JSON serialization.
 *
 * Conventions (must match `server/src/api`):
 * - IDs are `i32`/`i64` → `number`
 * - `BigDecimal` is serialized as a decimal string → `Decimal`
 * - `time::OffsetDateTime` is serialized as RFC3339 → `IsoDateTime`
 * - Optional values arrive as `null` in JSON → `T | null`
 */

/** Backend `BigDecimal`, always transported as a string ("14.86"). */
export type Decimal = string

/** Backend `time::OffsetDateTime`, transported as RFC3339 ("2026-10-24T18:02:00Z"). */
export type IsoDateTime = string

export interface Group {
  id: number
  name: string
  is_personal: boolean
}

export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
}

/** `GET /api/auth/me` — the session user plus the groups they belong to. */
export interface CurrentUser extends User {
  groups: Group[]
}

/** `POST /api/auth/login` payload. */
export interface LoginInput {
  username: string
  password: string
}

// ---------------------------------------------------------------------------
// Recipes & ingredients (Phase 1)
// ---------------------------------------------------------------------------

/** Recipe category — purely organizational, meals and components mix freely. */
export type RecipeKind = 'meal' | 'component'

export interface Recipe {
  id: number
  name: string
  comment: string | null
  group_id: number
  kind: RecipeKind
  weighed_in: boolean
}

export interface RecipeListItem extends Recipe {
  group_name: string
  /** Energy density in kJ/g — the basis for scaling portions. */
  energy_kj_per_g: number | null
}

export interface RecipeStats {
  /** Total resolved ingredient weight in kg. */
  weight_kg: Decimal
  /** Total resolved energy in kJ. */
  energy_kj: Decimal
  energy_kj_per_g: number | null
}

export interface RecipeIngredient {
  ingredient_id: number
  name: string | null
  /** Amount in the given unit. */
  amount: Decimal
  unit_id: number
}

export interface RecipeSubRecipe {
  recipe_id: number
  name: string
  /** Weight of the child recipe used by the parent, in kg. */
  weight: Decimal
}

export interface RecipeStep {
  id: number
  order: number
  name: string
  description: string
  fixed_duration_seconds: number
  duration_per_kg_seconds: number
}

export interface RecipeProperty {
  id: number
  name: string
}

export interface RecipeDetail extends Recipe {
  stats: RecipeStats | null
  ingredients: RecipeIngredient[]
  sub_recipes: RecipeSubRecipe[]
  steps: RecipeStep[]
  properties: RecipeProperty[]
}

export interface Ingredient {
  id: number
  name: string
  /** Energy density in kJ/g. */
  energy: Decimal
  comment: string | null
  group_id: number
}

export interface IngredientWithSources extends Ingredient {
  has_sources: boolean
}

export interface IngredientSource {
  id: number
  ingredient_id: number
  store_id: number
  /** Package size in kg. */
  package_size: Decimal
  unit_id: number
  price: Decimal
  url: string | null
  comment: string | null
}

/** Weight in kg per unit — enables amount conversions (1 piece = 0.12 kg). */
export interface IngredientWeight {
  ingredient_id: number
  unit_id: number
  weight: Decimal
}

export interface Property {
  id: number
  name: string
}

export interface Store {
  id: number
  name: string
}

export interface Unit {
  id: number
  name: string
}

export interface IngredientDetail {
  ingredient: Ingredient
  sources: IngredientSource[]
  weights: IngredientWeight[]
  properties: Property[]
}
