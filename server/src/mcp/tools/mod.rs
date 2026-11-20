//! Modular MCP tool routers grouped by domain (`events`, `recipes`, `inventory`).

pub mod events;
pub mod inventory;
pub mod recipes;

use rmcp::handler::server::router::tool::ToolRouter;

use crate::mcp::FoodcalcMcpServer;

/// Combines all domain tool routers into a single router for [`FoodcalcMcpServer`].
pub fn combined_tool_router() -> ToolRouter<FoodcalcMcpServer> {
    FoodcalcMcpServer::events_tool_router()
        + FoodcalcMcpServer::recipes_tool_router()
        + FoodcalcMcpServer::inventory_tool_router()
}