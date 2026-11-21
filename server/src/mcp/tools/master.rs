use crate::api::respond;
use crate::app::master;
use crate::mcp::error::map_tool_result;
use crate::mcp::FoodcalcMcpServer;
use crate::MyAppState;
use axum::extract::State;
use axum::response::Response;
use rmcp::{
    handler::server::wrapper::Parameters,
    model::CallToolResult,
    tool, tool_router, ErrorData as McpError,
};

#[tool_router(router = master_tool_router, vis = "pub")]
impl FoodcalcMcpServer {
    // /// Fetches an event's frame data, planned meals, total cost and the
    // /// caller's resolved permissions.
    // #[tool(
    //     name = "get_event",
    //     description = "Get an event's frame data (name, comment, budget, group), planned meals, total cost, and the caller's resolved permissions for the event."
    // )]
    // pub async fn get_event(
    //     &self,
    //     Parameters(params): Parameters<GetEventParams>,
    //     context: RequestContext<RoleServer>,
    // ) -> Result<CallToolResult, McpError> {
    //     let actor = extract_actor(&context)?;
    //     if let Some(denied) = super::check_tool_allowed(&actor, "get_event") {
    //         return Ok(denied);
    //     }
    //     map_tool_result(events::get_event_details(&self.state, &actor.ctx, params.event_id).await)
    // }


    #[tool(
        name = "get_available_stores",
        description = "Get a list of available stores for meal planning and shopping."
    )]
    pub async fn get_available_stores(
        &self,
        // Parameters(params): Parameters<GetAvailableStoresParams>
    ) -> Result<CallToolResult, McpError> {
        map_tool_result(master::get_available_stores(&self.state).await)
    }

    #[tool(
        name = "get_available_units",
        description = "Get a list of available units for meal planning and shopping."
    )]
    pub async fn get_available_units(
        &self,
        // Parameters(params): Parameters<GetAvailableUnitsParams>
    ) -> Result<CallToolResult, McpError> {
        map_tool_result(master::get_available_units(&self.state).await)
    }

    #[tool(
        name = "get_food_properties",
        description = "Get a list of available food properties (allergens, dietary constraints) for meal planning and shopping."
    )]
    pub async fn get_food_properties(
        &self,
        // Parameters(params): Parameters<GetFoodPropertiesParams>
    ) -> Result<CallToolResult, McpError> {
        map_tool_result(master::get_food_properties(&self.state).await)
    }

    #[tool(
        name = "get_available_event_places",
        description = "Get a list of available event places for meal planning and shopping."
    )]
    pub async fn get_available_event_places(
        &self,
        // Parameters(params): Parameters<GetAvailableEventPlacesParams>
    ) -> Result<CallToolResult, McpError> {
        map_tool_result(master::get_available_event_places(&self.state).await)
    }
}