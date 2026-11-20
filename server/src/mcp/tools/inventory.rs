//! Ingredient catalog search and inventory overview MCP tools.

use rmcp::{
    handler::server::wrapper::Parameters, model::CallToolResult, service::RequestContext, tool,
    tool_router, ErrorData as McpError, RoleServer,
};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::json;

use crate::app::{
    ingredients::{self, IngredientListQuery},
    inventories,
};
use crate::mcp::{
    auth::extract_actor,
    error::{map_app_error_to_tool, map_tool_result, tool_json},
    FoodcalcMcpServer,
};

/// Parameters for `search_ingredients`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct SearchIngredientsParams {
    /// Optional case-insensitive substring search on the ingredient name.
    pub search: Option<String>,
    /// Optional allergen or dietary property ID to filter matching ingredients.
    pub property_id: Option<i32>,
}

/// Parameters for `get_inventory_overview`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetInventoryOverviewParams {
    /// Optional specific inventory ID to inspect; if omitted, lists all accessible inventories with their stock items.
    pub inventory_id: Option<i32>,
}

#[tool_router(router = inventory_tool_router, vis = "pub")]
impl FoodcalcMcpServer {
    /// Searches ingredients visible to the user's groups, including supplier sources and pricing.
    #[tool(
        name = "search_ingredients",
        description = "Search accessible ingredients by name substring and/or allergen/dietary property ID, including store sources and packaging."
    )]
    pub async fn search_ingredients(
        &self,
        Parameters(params): Parameters<SearchIngredientsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "search_ingredients") {
            return Ok(denied);
        }
        let query = IngredientListQuery {
            search: params.search,
            property_id: params.property_id,
        };
        map_tool_result(ingredients::list_ingredients(&self.state, &actor, query).await)
    }

    /// Returns either a single inventory with its stock items or an overview of all
    /// inventories accessible to the current user.
    #[tool(
        name = "get_inventory_overview",
        description = "Inspect stock levels across all accessible inventories, or fetch detailed items for a single inventory_id."
    )]
    pub async fn get_inventory_overview(
        &self,
        Parameters(params): Parameters<GetInventoryOverviewParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "get_inventory_overview") {
            return Ok(denied);
        }

        if let Some(inventory_id) = params.inventory_id {
            let inventory =
                match inventories::get_inventory(&self.state, &actor, inventory_id).await {
                    Ok(inv) => inv,
                    Err(err) => return map_app_error_to_tool(err),
                };
            let items =
                match inventories::list_inventory_items(&self.state, &actor, inventory_id).await {
                    Ok(items) => items,
                    Err(err) => return map_app_error_to_tool(err),
                };

            return tool_json(&json!({
                "inventory": inventory,
                "item_count": items.len(),
                "items": items,
            }));
        }

        let all_inventories = match inventories::list_inventories(&self.state, &actor).await {
            Ok(list) => list,
            Err(err) => return map_app_error_to_tool(err),
        };

        let mut overview = Vec::with_capacity(all_inventories.len());
        for inv in all_inventories {
            let items = inventories::list_inventory_items(&self.state, &actor, inv.id)
                .await
                .unwrap_or_default();
            overview.push(json!({
                "inventory": inv,
                "item_count": items.len(),
                "items": items,
            }));
        }

        tool_json(&json!({
            "inventory_count": overview.len(),
            "inventories": overview,
        }))
    }
}
