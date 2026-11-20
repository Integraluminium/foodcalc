/**
 * DTO types mirroring the backend's JSON serialization.
 *
 * Conventions (must match `server/src/api`):
 * - IDs are `i32`/`i64` → `number`
 * - `BigDecimal` is serialized as a decimal string → `Decimal`
 * - `time::OffsetDateTime` is serialized as RFC3339 → `IsoDateTime`
 * - Optional values arrive as `null` in JSON → `T | null`
 */

import type {GlobalPermission, GroupPermission} from "../lib/permissions.ts";

export type {GlobalPermission, GroupPermission};

/** Backend `BigDecimal`, always transported as a string ("14.86"). */
export type Decimal = string

/** Backend `time::OffsetDateTime`, transported as RFC3339 ("2026-10-24T18:02:00Z"). */
export type IsoDateTime = string

/** Role slugs come from the backend role catalog (`GET /api/roles`) —
 *  never hardcoded in the frontend. Display names via `common:roles.<slug>`. */
export type RoleSlug = string

export interface RoleDefinition {
  slug: RoleSlug
  name: string
  description: string
  /** `basic` = membership presets (Leser, Team, Leitung), `domain` = departments. */
  category: 'basic' | 'domain'
  is_system: boolean
  permissions: GroupPermission[]
}

export interface Group {
  id: number
  name: string
  is_personal: boolean
  roles: RoleSlug[]
  permissions: GroupPermission[]
}

export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
  global_permissions: GlobalPermission[]
}

export interface GroupMember extends AdminUser {
  roles: RoleSlug[]
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
  comment: string | undefined
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
  /** Marks this step as a HACCP control point. */
  is_haccp: boolean
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
  has_sources?: boolean
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

// ---------------------------------------------------------------------------
// User & group management (Phase 3)
// ---------------------------------------------------------------------------

export interface RegisterInput {
  username: string
  email: string
  password: string
}

/** Admin user row (never contains a password hash). */
export interface AdminUser {
  id: number
  username: string
  email: string
  is_admin: boolean
  /** RFC 3339. */
  created_at: string
}

/** One node of the recipe recursion tree (view mode). */
export interface RecipeTreeIngredient {
  ingredient_id: number
  name: string | null
  /** Raw amount as entered on the recipe. */
  amount: Decimal
  unit_id: number
  unit_name: string | null
  /** Base weight in kg (amount × kg-per-unit); null without a conversion. */
  weight: Decimal | null
}

export interface RecipeTreeNode {
  recipe_id: number
  name: string
  kind: 'meal' | 'component'
  /** kg of this sub-recipe used by its parent; null for the root. */
  weight: Decimal | null
  ingredients: RecipeTreeIngredient[]
  children: RecipeTreeNode[]
}

export interface AdminUserWithGroups extends AdminUser {
  global_permissions: GlobalPermission[]
  groups: Group[]
}

export interface UserUpdateInput {
  username?: string
  email?: string
  is_admin?: boolean
}

export interface PasswordChangeInput {
  /** Required when a user changes their own password. */
  current_password?: string
  new_password: string
}

// ---------------------------------------------------------------------------
// Events & meal planning (Phase 2)
// ---------------------------------------------------------------------------

export interface EventListItem {
  id: number
  name: string
  comment: string | null
  /** Budget as BigDecimal string. */
  budget: Decimal | null
  group_id: number
  meal_count: number
  /** Total ingredient cost as BigDecimal string. */
  total_cost: Decimal
  /** RFC 3339, null when the event has no meals yet. */
  first_meal: string | null
  last_meal: string | null
}

export interface Event {
  id: number
  name: string
  comment: string | null
  budget: Decimal | null
  group_id: number
}

/** A planned meal with the planner aggregates (scaled weight, density, price). */
export interface PlannerMeal {
  meal_id: number
  event_id: number
  recipe_id: number
  name: string
  weighed_in: boolean
  place_id: number
  place: string
  start_time: string
  end_time: string
  comment: string | null
  servings: number
  /** Planned energy per portion (kJ) — the scaling input. */
  energy_per_serving: Decimal
  /** Total cooked weight in kg implied by energy_per_serving × servings. */
  weight: Decimal
  /** Recipe energy density (kJ/g) — null when nothing is resolvable. */
  energy_kj_per_g: number | null
  /** Total ingredient cost under the event's source overrides. */
  price: Decimal
}

export interface EventDetail {
  event: Event
  meals: PlannerMeal[]
  total_cost: Decimal
  /** Resolved permissions of the current user for this event
   *  (group baseline ∪ direct event roles) — basis for capability guards. */
  permissions?: GroupPermission[]
}

/** Direct per-event collaborator (`event_user_roles`). */
export interface EventMember {
  user_id: number
  username: string
  email: string
  roles: RoleSlug[]
}

/** Default roles for new members of a group. */
export interface GroupDefaultRoles {
  /** `null` = inherit the global default. */
  roles: RoleSlug[] | null
  /** What a new member would actually receive. */
  resolved: RoleSlug[]
  inherited: boolean
}

/** Global default roles (`app_settings['groups.default_member_roles']`). */
export interface MemberDefaults {
  roles: RoleSlug[]
  groups_overriding: number
}

/** One audit-log row (ISO 27001 A.8.15). */
export interface AuditEntry {
  id: number
  created_at: IsoDateTime
  actor_user_id: number | null
  actor_username: string
  action: string
  target_user_id: number | null
  entity_type: string | null
  entity_id: number | null
  group_id: number | null
  event_id: number | null
  /** JSON object serialized as text. */
  details: string
}

export interface AuditPage {
  entries: AuditEntry[]
  total: number
}

/** Query parameters of the audit endpoints. */
export interface AuditFilter {
  from?: string
  until?: string
  actor_user_id?: number
  action?: string
  group_id?: number
  event_id?: number
  limit?: number
  offset?: number
}

export interface Place {
  id: number
  name: string
  comment: string | null
}

export interface ShoppingTour {
  id: number
  event_id: number
  tour_date: string
  store_id: number
  store_name: string | null
  /** Completed tours are locked (no edits, no item changes). */
  completed?: boolean
}

export interface ShoppingListItem {
  event_id: number
  event_name: string
  ingredient_id: number
  ingredient_name: string
  /** Total kg to buy; null when the unit weight is unknown (shows as "?"). */
  weight: Decimal | null
  /** Energy in kJ; null whenever weight is null. */
  energy: Decimal | null
  price: Decimal | null
  tour_id: number | null
  category: string | null
}

export interface TourWithItems extends ShoppingTour {
  items: ShoppingListItem[]
  /** Sum of item prices; null when any item has no priced source. */
  total_price: Decimal | null
}

export interface IngredientWithoutTour {
  ingredient_id: number
  ingredient_name: string
  weight: Decimal | null
  store_name: string
}

export interface ShoppingList {
  tours: TourWithItems[]
  without_tour: IngredientWithoutTour[]
}

export interface SourceOverride {
  event_id: number
  ingredient_id: number
  source_id: number
  ingredient_name: string
  store_id: number
  store_name: string
}

export interface FoodPrepWithRecipe {
  id: number
  event_id: number
  recipe_id: number
  /** RFC 3339 timestamp. */
  prep_date: string
  use_from: string | null
  use_until: string
  recipe_name: string
}

export interface EventInventoryCoverage {
  ingredient_id: number
  ingredient_name: string
  demand_kg: Decimal
  covered_kg: Decimal
}

export interface Inventory {
  id: number
  name: string
  group_id: number
}

export interface InventoryItemWithName {
  inventory_id: number
  ingredient_id: number
  amount: Decimal
  name: string
}

// ---------------------------------------------------------------------------
// Live Status Board (Kitchen & Ausgabe)
// ---------------------------------------------------------------------------

export type ReorderUrgency = 'normal' | 'urgent' | 'critical'
export type ReorderStatus = 'requested' | 'preparing' | 'en_route' | 'delivered'
export type ServingAvailability = 'available' | 'low' | 'replenishing' | 'sold_out'

export interface KitchenReorderItem {
  id: number
  meal_id: number
  dish_name: string
  amount_label: string
  station: string
  urgency: ReorderUrgency
  status: ReorderStatus
  note: string | null
  requested_at: IsoDateTime
}

export interface OutgoingBatchItem {
  meal_id: number
  dish_name: string
  serving_time: IsoDateTime
  portions: number
  availability: ServingAvailability
  ready_for_dispatch: boolean
}

export interface KitchenPrepTask {
  id: string
  title: string
  dish_name: string
  target_time: IsoDateTime
  quantity_label: string | null
  assignee: string | null
  status: 'todo' | 'in_progress'
}

export interface DishPropertyTag {
  id: number
  name: string
  code: string | null
  is_allergen: boolean
}

export interface ServingDishItem {
  meal_id: number
  dish_name: string
  dish_name_en: string | null
  description: string | null
  serving_start: IsoDateTime
  serving_end: IsoDateTime | null
  availability: ServingAvailability
  eta_minutes: number | null
  properties: DishPropertyTag[]
}

export interface StatusBoardSnapshot {
  event_name: string
  server_time: IsoDateTime
  kitchen: {
    reorders: KitchenReorderItem[]
    outgoing: OutgoingBatchItem[]
    prep_tasks: KitchenPrepTask[]
  }
  serving: {
    current: ServingDishItem[]
    upcoming: ServingDishItem[]
  }
}