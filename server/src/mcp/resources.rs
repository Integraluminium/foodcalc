//! Read-only MCP resources exposing active events and master metadata.

use rmcp::{
    model::{ListResourcesResult, ReadResourceResult, Resource, ResourceContents},
    ErrorData as McpError,
};
use serde_json::json;

use crate::app::{events, master, AppCtx, MyAppState};
use crate::mcp::error::map_app_error_to_mcp;

pub const URI_ACTIVE_EVENTS: &str = "foodcalc://events/active";
pub const URI_MASTER_METADATA: &str = "foodcalc://master/metadata";

pub fn list_resources() -> ListResourcesResult {
    let mut active_events = Resource::new(URI_ACTIVE_EVENTS, "Active Events");
    active_events.title = Some("Active Catering Events".into());
    active_events.description = Some(
        "JSON list of all catering events visible to the authenticated user with planner totals."
            .into(),
    );
    active_events.mime_type = Some("application/json".into());

    let mut master_metadata = Resource::new(URI_MASTER_METADATA, "Master Metadata");
    master_metadata.title = Some("Units, Allergens/Properties, Stores & Serving Places".into());
    master_metadata.description = Some(
        "Reference catalog of measurement units, allergen/dietary properties, stores, and event serving places."
            .into(),
    );
    master_metadata.mime_type = Some("application/json".into());

    ListResourcesResult::with_all_items(vec![active_events, master_metadata])
}

pub async fn read_resource(
    state: &MyAppState,
    actor: &AppCtx,
    uri: &str,
) -> Result<ReadResourceResult, McpError> {
    match uri {
        URI_ACTIVE_EVENTS => {
            let summaries = events::list_summaries(state, &actor.ctx)
                .await
                .map_err(map_app_error_to_mcp)?;
            let text = serde_json::to_string_pretty(&summaries)
                .map_err(|err| McpError::internal_error(err.to_string(), None))?;
            Ok(ReadResourceResult::new(vec![ResourceContents::text(
                text, uri,
            )]))
        }
        URI_MASTER_METADATA => {
            let (units, properties, stores, places) = tokio::try_join!(
                master::get_available_units(state),
                master::get_food_properties(state),
                master::get_available_stores(state),
                master::get_available_event_places(state),
            )
            .map_err(map_app_error_to_mcp)?;

            let payload = json!({
                "units": units,
                "allergens_and_properties": properties,
                "stores": stores,
                "places": places,
            });
            let text = serde_json::to_string_pretty(&payload)
                .map_err(|err| McpError::internal_error(err.to_string(), None))?;
            Ok(ReadResourceResult::new(vec![ResourceContents::text(
                text, uri,
            )]))
        }
        _ => Err(McpError::resource_not_found(
            format!("unknown resource URI: {uri}"),
            None,
        )),
    }
}
