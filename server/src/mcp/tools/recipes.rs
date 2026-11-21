//! Recipe search and energy-based portion scaling MCP tools.

use bigdecimal::ToPrimitive;
use rmcp::{
    handler::server::wrapper::Parameters,
    model::{CallToolResult, ContentBlock},
    service::RequestContext,
    tool, tool_router, ErrorData as McpError, RoleServer,
};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::json;

use super::{actor_attribution, confirm_or_abort};
use crate::app::recipes::{self, RecipeListQuery};
use crate::app::{AppCtx, MyAppState};
use crate::mcp::{
    auth::extract_actor,
    error::{map_app_error_to_tool, map_tool_result, tool_json},
    FoodcalcMcpServer,
};

/// Parameters for `search_recipes`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct SearchRecipesParams {
    /// Optional case-insensitive substring search on the recipe name.
    pub search: Option<String>,
    /// Optional recipe kind filter: `"meal"` for full dishes or `"component"` for sub-recipes/sauces.
    pub recipe_type: Option<String>,
}

/// Parameters for `get_recipe_scaled`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetRecipeScaledParams {
    /// Numeric ID of the recipe to fetch and scale.
    pub recipe_id: i32,
    /// Target number of servings/portions (defaults to `1` if omitted).
    pub servings: Option<u32>,
    /// Target energy per serving in kJ (defaults to the recipe's unscaled total energy / servings if omitted).
    pub energy_per_serving_kj: Option<f64>,
}

/// Parameters for `get_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetRecipeParams {
    /// Numeric ID of the recipe to fetch.
    pub recipe_id: i32,
}

/// Parameters for `create_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateRecipeParams {
    pub name: String,
    /// `"meal"` for full dishes or `"component"` for sub-recipes/sauces.
    pub kind: String,
    /// Numeric ID of the group that will own the recipe.
    pub group_id: i32,
    pub comment: Option<String>,
    /// Mark amounts as verified accurate (weighed in).
    pub weighed_in: Option<bool>,
}

/// Parameters for `update_recipe`. Omitted fields keep their current value;
/// an empty comment clears it.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct UpdateRecipeParams {
    pub recipe_id: i32,
    pub name: Option<String>,
    pub comment: Option<String>,
    /// `"meal"` or `"component"`.
    pub kind: Option<String>,
    pub weighed_in: Option<bool>,
}

/// One ingredient line of an import draft.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ImportIngredientLine {
    /// Ingredient name as written in the source text.
    pub name: String,
    /// Decimal amount string in `unit` (e.g. `"500"` with unit `"g"`).
    pub amount: String,
    /// Unit name as written in the source text (e.g. `"g"`, `"kg"`, `"piece"`).
    pub unit: String,
}

/// One preparation step of an import draft.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ImportStep {
    /// Ordering key (steps are executed ascending).
    pub order: f64,
    pub name: String,
    pub description: String,
}

/// Parameters for `import_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ImportRecipeParams {
    pub name: String,
    /// `"meal"` for full dishes or `"component"` for sub-recipes/sauces.
    pub kind: String,
    /// Numeric ID of the group that will own the recipe (and draft ingredients).
    pub group_id: i32,
    pub comment: Option<String>,
    pub weighed_in: Option<bool>,
    pub ingredients: Vec<ImportIngredientLine>,
    pub steps: Vec<ImportStep>,
    /// When `true`, ingredients not found in the catalog are created as
    /// zero-energy drafts (flagged in the review report). Default: skipped.
    pub create_missing_ingredients: Option<bool>,
}

/// Parameters for `add_recipe_ingredient` / `update_recipe_ingredient`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RecipeLineParams {
    pub recipe_id: i32,
    pub ingredient_id: i32,
    /// Decimal amount string (e.g. `"0.5"` kg or `"500"` g — as per `unit_id`).
    pub amount: String,
    pub unit_id: i32,
}

/// Parameters for `remove_recipe_ingredient`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RemoveRecipeLineParams {
    pub recipe_id: i32,
    pub ingredient_id: i32,
}

/// Parameters for `add_recipe_step` / `update_recipe_step`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RecipeStepParams {
    pub recipe_id: i32,
    /// Only for `update_recipe_step`.
    pub step_id: Option<i32>,
    pub order: f64,
    pub name: String,
    pub description: String,
    pub fixed_duration_seconds: i64,
    pub duration_per_kg_seconds: i64,
    /// Marks this step as a HACCP control point.
    pub is_haccp: bool,
}

/// Parameters for `remove_recipe_step`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RemoveRecipeStepParams {
    pub recipe_id: i32,
    pub step_id: i32,
}

/// Parameters for `add_recipe_sub_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct SubRecipeParams {
    pub recipe_id: i32,
    /// Numeric ID of the referenced (child) recipe.
    pub child_recipe_id: i32,
    /// Weight of the child recipe used by the parent, in kg.
    pub weight: String,
}

/// Parameters for `update_recipe_sub_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct SubRecipeWeightParams {
    pub recipe_id: i32,
    pub child_recipe_id: i32,
    /// Weight of the child recipe used by the parent, in kg.
    pub weight: String,
}

/// Parameters for `remove_recipe_sub_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RemoveSubRecipeParams {
    pub recipe_id: i32,
    pub child_recipe_id: i32,
}

/// Parameters for `clone_recipe`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct CloneRecipeParams {
    pub recipe_id: i32,
    /// Optional new name; defaults to `"<name> (Kopie)"`.
    pub name: Option<String>,
    /// Optional target group; defaults to the source recipe's group.
    pub group_id: Option<i32>,
}

#[tool_router(router = recipes_tool_router, vis = "pub")]
impl FoodcalcMcpServer {
    /// Searches recipes visible to the current user by name and/or kind (`meal` vs `component`).
    #[tool(
        name = "search_recipes",
        description = "Search accessible recipes by name substring and optional kind ('meal' or 'component'), returning energy density (kJ/g) and group metadata."
    )]
    pub async fn search_recipes(
        &self,
        Parameters(params): Parameters<SearchRecipesParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "search_recipes") {
            return Ok(denied);
        }
        let query = RecipeListQuery {
            r#type: params.recipe_type,
            search: params.search,
        };
        map_tool_result(recipes::list_recipes(&self.state, &actor.ctx, query).await)
    }

    /// Fetches a recipe's ingredients, sub-recipes, steps, and allergen/dietary
    /// properties, scaling all quantities to `servings × energy_per_serving_kj`.
    #[tool(
        name = "get_recipe_scaled",
        description = "Retrieve a recipe with allergen/dietary metadata, preparation steps, and ingredient/sub-recipe quantities scaled to the requested servings and energy per serving (kJ)."
    )]
    pub async fn get_recipe_scaled(
        &self,
        Parameters(params): Parameters<GetRecipeScaledParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "get_recipe_scaled") {
            return Ok(denied);
        }
        let detail = match recipes::get_recipe(&self.state, &actor, params.recipe_id).await {
            Ok(d) => d,
            Err(err) => return map_app_error_to_tool(err),
        };

        let servings = params.servings.unwrap_or(1).max(1) as f64;
        let base_energy_kj = detail
            .stats
            .as_ref()
            .and_then(|s| s.energy_kj.to_f64())
            .unwrap_or(0.0);
        let base_weight_kg = detail
            .stats
            .as_ref()
            .and_then(|s| s.weight_kg.to_f64())
            .unwrap_or(0.0);

        let target_total_energy_kj = match params.energy_per_serving_kj {
            Some(kj_per_serving) => kj_per_serving * servings,
            None => base_energy_kj * servings,
        };

        let scale_factor = if base_energy_kj > 0.0 {
            target_total_energy_kj / base_energy_kj
        } else {
            servings
        };

        let scaled_ingredients: Vec<serde_json::Value> = detail
            .ingredients
            .iter()
            .map(|ing| {
                let base_amt = ing.amount.to_f64().unwrap_or(0.0);
                json!({
                    "ingredient_id": ing.ingredient_id,
                    "name": ing.name,
                    "unit_id": ing.unit_id,
                    "base_amount": ing.amount,
                    "scaled_amount": base_amt * scale_factor,
                })
            })
            .collect();

        let scaled_sub_recipes: Vec<serde_json::Value> = detail
            .sub_recipes
            .iter()
            .map(|sub| {
                let base_w = sub.weight.to_f64().unwrap_or(0.0);
                json!({
                    "recipe_id": sub.recipe_id,
                    "name": sub.name,
                    "base_weight_kg": sub.weight,
                    "scaled_weight_kg": base_w * scale_factor,
                })
            })
            .collect();

        tool_json(&json!({
            "id": detail.id,
            "name": detail.name,
            "comment": detail.comment,
            "group_id": detail.group_id,
            "kind": detail.kind,
            "weighed_in": detail.weighed_in,
            "scaling": {
                "servings": servings as u32,
                "target_energy_per_serving_kj": target_total_energy_kj / servings,
                "target_total_energy_kj": target_total_energy_kj,
                "scale_factor": scale_factor,
                "base_total_weight_kg": base_weight_kg,
                "scaled_total_weight_kg": base_weight_kg * scale_factor,
                "energy_kj_per_g": detail.stats.as_ref().and_then(|s| s.energy_kj_per_g),
            },
            "allergens_and_properties": detail.properties,
            "ingredients": scaled_ingredients,
            "sub_recipes": scaled_sub_recipes,
            "steps": detail.steps,
        }))
    }

    /// Fetches a recipe's raw (unscaled) detail: the edit view used before
    /// changing a recipe.
    #[tool(
        name = "get_recipe",
        description = "Retrieve a recipe's raw (unscaled) detail: ingredients with base amounts, sub-recipes, steps, and allergen/dietary properties. Use before editing a recipe."
    )]
    pub async fn get_recipe(
        &self,
        Parameters(params): Parameters<GetRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "get_recipe") {
            return Ok(denied);
        }
        map_tool_result(recipes::get_recipe(&self.state, &actor, params.recipe_id).await)
    }

    /// Creates an empty recipe (add lines/steps with the fine-grained tools).
    #[tool(
        name = "create_recipe",
        description = "Create an empty recipe (kind 'meal' or 'component') owned by a group. Add ingredients and steps afterwards (requires human confirmation via elicitation before saving)."
    )]
    pub async fn create_recipe(
        &self,
        Parameters(params): Parameters<CreateRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "create_recipe") {
            return Ok(denied);
        }
        let kind = match recipes::parse_recipe_kind(&params.kind) {
            Ok(kind) => kind,
            Err(err) => return map_app_error_to_tool(err),
        };
        let summary = format!(
            "{}\nConfirm creating recipe '{}' (kind '{}') in group {}.",
            actor_attribution(&actor),
            params.name,
            params.kind,
            params.group_id,
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "create_recipe", summary).await
        {
            return Ok(aborted);
        }
        match recipes::create_new_recipe(
            &self.state,
            &actor,
            params.name,
            params.comment,
            kind,
            params.group_id,
            params.weighed_in,
        )
        .await
        {
            Ok(id) => tool_json(&json!({ "status": "created", "recipe_id": id })),
            Err(err) => map_app_error_to_tool(err),
        }
    }

    /// Updates a recipe's metadata (name/comment/kind/weighed_in).
    #[tool(
        name = "update_recipe",
        description = "Update a recipe's metadata: name, comment (empty string clears it), kind ('meal'/'component'), or weighed_in flag (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_recipe(
        &self,
        Parameters(params): Parameters<UpdateRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_recipe") {
            return Ok(denied);
        }
        let kind = match params.kind.as_deref() {
            None => None,
            Some(kind) => match recipes::parse_recipe_kind(kind) {
                Ok(kind) => Some(kind),
                Err(err) => return map_app_error_to_tool(err),
            },
        };
        let input = recipes::RecipeUpdateInput {
            name: params.name,
            comment: params.comment.map(|c| (!c.is_empty()).then_some(c)),
            kind,
            weighed_in: params.weighed_in,
        };
        let summary = format!(
            "{}\nConfirm updating recipe #{}.",
            actor_attribution(&actor),
            params.recipe_id,
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "update_recipe", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(recipes::update_recipe(&self.state, &actor, params.recipe_id, input).await)
    }

    /// Imports a whole structured recipe draft in one confirmed step.
    #[tool(
        name = "import_recipe",
        description = "Create a complete recipe from a structured draft (e.g. extracted from a textbook): resolves ingredient names and unit names against the catalog, optionally creates missing ingredients as zero-energy drafts, and returns a review report (requires human confirmation via elicitation before saving)."
    )]
    pub async fn import_recipe(
        &self,
        Parameters(params): Parameters<ImportRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "import_recipe") {
            return Ok(denied);
        }
        let summary = format!(
            "{}\nConfirm importing recipe '{}' (kind '{}', {} ingredient line(s), {} step(s)) \
             into group {}.\nUnknown ingredients will be {}.",
            actor_attribution(&actor),
            params.name,
            params.kind,
            params.ingredients.len(),
            params.steps.len(),
            params.group_id,
            match params.create_missing_ingredients {
                Some(true) => "created as zero-energy drafts",
                _ => "skipped and reported",
            },
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "import_recipe", summary).await
        {
            return Ok(aborted);
        }
        let input = recipes::RecipeImportInput {
            name: params.name,
            kind: params.kind,
            group_id: params.group_id,
            comment: params.comment,
            weighed_in: params.weighed_in,
            ingredients: params
                .ingredients
                .into_iter()
                .map(|line| recipes::RecipeImportIngredient {
                    name: line.name,
                    amount: line.amount,
                    unit: line.unit,
                })
                .collect(),
            steps: params
                .steps
                .into_iter()
                .map(|step| recipes::RecipeImportStep {
                    order: step.order,
                    name: step.name,
                    description: step.description,
                })
                .collect(),
            create_missing_ingredients: params.create_missing_ingredients,
        };
        map_tool_result(recipes::import_recipe(&self.state, &actor, input).await)
    }

    /// Adds one ingredient line to a recipe.
    #[tool(
        name = "add_recipe_ingredient",
        description = "Add one ingredient line (ingredient_id, amount, unit_id) to a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn add_recipe_ingredient(
        &self,
        Parameters(params): Parameters<RecipeLineParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "add_recipe_ingredient") {
            return Ok(denied);
        }
        let action = format!(
            "add ingredient #{} (amount {}, unit #{})",
            params.ingredient_id, params.amount, params.unit_id
        );
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "add_recipe_ingredient",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::add_ingredient(
                &self.state,
                &actor,
                params.recipe_id,
                recipes::RecipeIngredientInput {
                    ingredient_id: params.ingredient_id,
                    amount: params.amount,
                    unit_id: params.unit_id,
                },
            )
            .await,
        )
    }

    /// Replaces one ingredient line of a recipe.
    #[tool(
        name = "update_recipe_ingredient",
        description = "Replace one ingredient line (ingredient_id, amount, unit_id) of a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_recipe_ingredient(
        &self,
        Parameters(params): Parameters<RecipeLineParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_recipe_ingredient") {
            return Ok(denied);
        }
        let action = format!(
            "update ingredient #{} to amount {}, unit #{}",
            params.ingredient_id, params.amount, params.unit_id
        );
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "update_recipe_ingredient",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::update_ingredient(
                &self.state,
                &actor,
                params.recipe_id,
                recipes::RecipeIngredientInput {
                    ingredient_id: params.ingredient_id,
                    amount: params.amount,
                    unit_id: params.unit_id,
                },
            )
            .await,
        )
    }

    /// Removes one ingredient line from a recipe.
    #[tool(
        name = "remove_recipe_ingredient",
        description = "Remove one ingredient line from a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn remove_recipe_ingredient(
        &self,
        Parameters(params): Parameters<RemoveRecipeLineParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "remove_recipe_ingredient") {
            return Ok(denied);
        }
        let action = format!("remove ingredient #{}", params.ingredient_id);
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "remove_recipe_ingredient",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::remove_ingredient(&self.state, &actor, params.recipe_id, params.ingredient_id)
                .await,
        )
    }

    /// Adds a preparation step.
    #[tool(
        name = "add_recipe_step",
        description = "Add a preparation step to a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn add_recipe_step(
        &self,
        Parameters(params): Parameters<RecipeStepParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "add_recipe_step") {
            return Ok(denied);
        }
        let action = format!("add step '{}'", params.name);
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "add_recipe_step",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::add_step(&self.state, &actor, params.recipe_id, step_input(&params)).await,
        )
    }

    /// Replaces a preparation step.
    #[tool(
        name = "update_recipe_step",
        description = "Replace a preparation step of a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_recipe_step(
        &self,
        Parameters(params): Parameters<RecipeStepParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_recipe_step") {
            return Ok(denied);
        }
        let Some(step_id) = params.step_id else {
            return Ok(error_result(
                "Validation: step_id is required for update_recipe_step.",
            ));
        };
        let action = format!("update step #{} ('{}')", step_id, params.name);
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "update_recipe_step",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::update_step(
                &self.state,
                &actor,
                params.recipe_id,
                step_id,
                step_input(&params),
            )
            .await,
        )
    }

    /// Removes a preparation step.
    #[tool(
        name = "remove_recipe_step",
        description = "Remove a preparation step from a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn remove_recipe_step(
        &self,
        Parameters(params): Parameters<RemoveRecipeStepParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "remove_recipe_step") {
            return Ok(denied);
        }
        let action = format!("remove step #{}", params.step_id);
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "remove_recipe_step",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::remove_step(&self.state, &actor, params.recipe_id, params.step_id).await,
        )
    }

    /// References another recipe as a sub-recipe.
    #[tool(
        name = "add_recipe_sub_recipe",
        description = "Reference another recipe as a sub-recipe (child) of this recipe with a weight in kg (requires human confirmation via elicitation before saving)."
    )]
    pub async fn add_recipe_sub_recipe(
        &self,
        Parameters(params): Parameters<SubRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "add_recipe_sub_recipe") {
            return Ok(denied);
        }
        let action = format!(
            "reference recipe #{} as sub-recipe with weight {} kg",
            params.child_recipe_id, params.weight
        );
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "add_recipe_sub_recipe",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::add_sub_recipe(
                &self.state,
                &actor,
                params.recipe_id,
                recipes::SubRecipeInput {
                    child_recipe_id: params.child_recipe_id,
                    weight: params.weight,
                },
            )
            .await,
        )
    }

    /// Changes the referenced sub-recipe weight.
    #[tool(
        name = "update_recipe_sub_recipe",
        description = "Change the weight (kg) of a referenced sub-recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_recipe_sub_recipe(
        &self,
        Parameters(params): Parameters<SubRecipeWeightParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_recipe_sub_recipe") {
            return Ok(denied);
        }
        let action = format!(
            "set sub-recipe #{} weight to {} kg",
            params.child_recipe_id, params.weight
        );
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "update_recipe_sub_recipe",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::update_sub_recipe(
                &self.state,
                &actor,
                params.recipe_id,
                params.child_recipe_id,
                recipes::SubRecipeWeightInput {
                    weight: params.weight,
                },
            )
            .await,
        )
    }

    /// Removes a sub-recipe reference.
    #[tool(
        name = "remove_recipe_sub_recipe",
        description = "Remove a sub-recipe reference from a recipe (requires human confirmation via elicitation before saving)."
    )]
    pub async fn remove_recipe_sub_recipe(
        &self,
        Parameters(params): Parameters<RemoveSubRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "remove_recipe_sub_recipe") {
            return Ok(denied);
        }
        let action = format!("remove sub-recipe reference #{}", params.child_recipe_id);
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "remove_recipe_sub_recipe",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        map_tool_result(
            recipes::remove_sub_recipe(
                &self.state,
                &actor,
                params.recipe_id,
                params.child_recipe_id,
            )
            .await,
        )
    }

    /// Deep-clones a recipe.
    #[tool(
        name = "clone_recipe",
        description = "Deep-clone a recipe (optionally with a new name and/or into another group) — the copy is fully independent (requires human confirmation via elicitation before saving)."
    )]
    pub async fn clone_recipe(
        &self,
        Parameters(params): Parameters<CloneRecipeParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "clone_recipe") {
            return Ok(denied);
        }
        let action = match params.name.as_deref() {
            Some(name) => format!("clone recipe #{} as '{name}'", params.recipe_id),
            None => format!("clone recipe #{}", params.recipe_id),
        };
        if let Some(aborted) = confirm_recipe_edit(
            &self.state,
            &actor,
            &context,
            "clone_recipe",
            params.recipe_id,
            &action,
        )
        .await
        {
            return Ok(aborted);
        }
        match recipes::clone_recipe(
            &self.state,
            &actor,
            params.recipe_id,
            recipes::RecipeCloneInput {
                name: params.name,
                group_id: params.group_id,
            },
        )
        .await
        {
            Ok(id) => tool_json(&json!({ "status": "created", "recipe_id": id })),
            Err(err) => map_app_error_to_tool(err),
        }
    }
}

/// Builds the app-layer step input from the MCP params.
fn step_input(params: &RecipeStepParams) -> recipes::RecipeStepInput {
    recipes::RecipeStepInput {
        order: params.order,
        name: params.name.clone(),
        description: params.description.clone(),
        fixed_duration_seconds: params.fixed_duration_seconds,
        duration_per_kg_seconds: params.duration_per_kg_seconds,
        is_haccp: params.is_haccp,
    }
}

/// Builds a recoverable error as a successful tool result with error content.
fn error_result(message: &str) -> CallToolResult {
    CallToolResult::error(vec![ContentBlock::text(message.to_string())])
}

/// Shared elicitation gate for recipe edits: resolves the recipe (also
/// enforcing read visibility) so the confirmation names the recipe, then asks.
async fn confirm_recipe_edit(
    state: &MyAppState,
    actor: &AppCtx,
    context: &RequestContext<RoleServer>,
    tool_name: &str,
    recipe_id: i32,
    action: &str,
) -> Option<CallToolResult> {
    let recipe_name = match recipes::get_recipe(state, actor, recipe_id).await {
        Ok(detail) => detail.name,
        Err(err) => return map_app_error_to_tool(err).ok(),
    };
    let summary = format!(
        "{}\nConfirm editing recipe '{}' (ID {}): {}.",
        actor_attribution(actor),
        recipe_name,
        recipe_id,
        action
    );
    confirm_or_abort(state, actor, context, tool_name, summary).await
}
