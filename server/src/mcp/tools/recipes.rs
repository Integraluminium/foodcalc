//! Recipe search and energy-based portion scaling MCP tools.

use bigdecimal::ToPrimitive;
use rmcp::{
    handler::server::wrapper::Parameters,
    model::CallToolResult,
    service::RequestContext,
    tool, tool_router, ErrorData as McpError, RoleServer,
};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::json;

use crate::app::recipes::{self, RecipeListQuery};
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
}
