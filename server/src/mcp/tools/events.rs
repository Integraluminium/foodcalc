//! Event & logistics MCP tools (read-only composite briefs + elicitation-guarded mutations).

use bigdecimal::ToPrimitive;
use rmcp::{
    handler::server::wrapper::Parameters,
    model::{CallToolResult, ContentBlock},
    schemars::JsonSchema,
    service::RequestContext,
    tool, tool_router, ErrorData as McpError, RoleServer,
};
use serde::Deserialize;
use serde_json::json;

use crate::app::{
    events::{
        self,
        logistics::{inventory_coverage, list_event_inventories, list_food_preps},
        meals::{self, MealAddInput},
        TourInput,
    },
    Error as AppError,
};
use crate::mcp::{
    auth::extract_actor,
    error::{map_app_error_to_tool, map_tool_result, tool_json},
    ConfirmMutation, FoodcalcMcpServer,
};

/// Parameters for `list_events`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListEventsParams {
    /// Optional case-insensitive substring filter applied to the event name.
    pub search: Option<String>,
}

/// Parameters for `get_event_catering_brief`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetEventCateringBriefParams {
    /// Numeric ID of the event to inspect.
    pub event_id: i32,
}

/// Parameters for `add_meal_to_event` (requires human-in-the-loop elicitation confirmation).
#[derive(Debug, Deserialize, JsonSchema)]
pub struct AddMealToEventParams {
    /// Numeric ID of the target event.
    pub event_id: i32,
    /// Numeric ID of the recipe to serve.
    pub recipe_id: i32,
    /// Optional serving location ID (defaults to the first configured place if omitted).
    pub place_id: Option<i32>,
    /// Meal start timestamp in RFC 3339 format (e.g. `"2026-10-15T12:00:00Z"`).
    pub start_time: String,
    /// Optional meal end timestamp in RFC 3339 format (defaults to `start_time` if omitted).
    pub end_time: Option<String>,
    /// Planned energy per portion in kJ as a decimal string (e.g. `"2500"`), used to scale recipe ingredients.
    pub energy_per_serving: String,
    /// Planned number of portions / attendees for this meal.
    pub servings: i32,
    /// Optional note or serving instruction attached to the planned meal.
    pub comment: Option<String>,
}

/// Parameters for `update_shopping_tour` (requires human-in-the-loop elicitation confirmation).
#[derive(Debug, Deserialize, JsonSchema)]
pub struct UpdateShoppingTourParams {
    /// Numeric ID of the event owning the shopping tour.
    pub event_id: i32,
    /// Numeric ID of the shopping tour to reschedule or move to another store.
    pub tour_id: i32,
    /// New shopping tour timestamp in RFC 3339 format (e.g. `"2026-10-14T09:00:00Z"`).
    pub tour_date: String,
    /// Numeric ID of the target store for this shopping tour.
    pub store_id: i32,
}

#[tool_router(router = events_tool_router, vis = "pub")]
impl FoodcalcMcpServer {
    /// Lists all catering events accessible to the current user with summary metrics.
    #[tool(
        name = "list_events",
        description = "List all catering events accessible to the authenticated user, optionally filtered by name."
    )]
    pub async fn list_events(
        &self,
        Parameters(params): Parameters<ListEventsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        let summaries = match events::list_summaries(&self.state, &actor.ctx).await {
            Ok(list) => list,
            Err(err) => return map_app_error_to_tool(err),
        };

        let search = params.search.unwrap_or_default().to_lowercase();
        let filtered: Vec<serde_json::Value> = summaries
            .into_iter()
            .filter_map(|summary| serde_json::to_value(summary).ok())
            .filter(|val| {
                if search.is_empty() {
                    return true;
                }
                val.get("name")
                    .and_then(|v| v.as_str())
                    .map(|name| name.to_lowercase().contains(&search))
                    .unwrap_or(true)
            })
            .collect();

        tool_json(&json!({
            "count": filtered.len(),
            "events": filtered,
        }))
    }

    /// Composes a full catering brief for one event: metadata, budget vs. cost,
    /// scheduled meals with attendee/serving counts, total planned energy (kJ),
    /// shopping tours, unassigned ingredients, food-prep tasks, and inventory coverage.
    #[tool(
        name = "get_event_catering_brief",
        description = "Get a comprehensive catering brief for an event including metadata, attendee/serving counts, scheduled meals, total energy (kJ), shopping tours, food preps, and inventory coverage."
    )]
    pub async fn get_event_catering_brief(
        &self,
        Parameters(params): Parameters<GetEventCateringBriefParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        let event_id = params.event_id;

        let details = match events::get_event_details(&self.state, &actor.ctx, event_id).await {
            Ok(d) => d,
            Err(err) => return map_app_error_to_tool(err),
        };

        let (planner_meals, shopping_list, food_preps, linked_inventories, coverage) =
            match tokio::try_join!(
                meals::list(&self.state, &actor.ctx, event_id),
                events::get_shopping_list(&self.state, &actor.ctx, event_id),
                list_food_preps(&self.state, &actor.ctx, event_id),
                list_event_inventories(&self.state, &actor.ctx, event_id),
                inventory_coverage(&self.state, &actor.ctx, event_id),
            ) {
                Ok(res) => res,
                Err(err) => return map_app_error_to_tool(err),
            };

        let total_servings: i64 = planner_meals.iter().map(|m| i64::from(m.servings)).sum();
        let max_meal_servings: i32 = planner_meals
            .iter()
            .map(|m| m.servings)
            .max()
            .unwrap_or(0);
        let total_energy_kj: f64 = planner_meals
            .iter()
            .map(|m| m.energy_per_serving.to_f64().unwrap_or(0.0) * f64::from(m.servings))
            .sum();
        let total_food_weight_kg: f64 = planner_meals
            .iter()
            .map(|m| m.weight.to_f64().unwrap_or(0.0))
            .sum();

        let brief = json!({
            "event": details.event,
            "budget": details.event.budget,
            "total_cost": details.total_cost,
            "attendee_and_energy_summary": {
                "scheduled_meal_count": planner_meals.len(),
                "total_meal_servings": total_servings,
                "peak_single_meal_servings": max_meal_servings,
                "total_planned_energy_kj": total_energy_kj,
                "total_food_weight_kg": total_food_weight_kg,
            },
            "scheduled_meals": planner_meals,
            "logistics": {
                "shopping_tours_count": shopping_list.tours.len(),
                "unassigned_ingredients_count": shopping_list.without_tour.len(),
                "shopping_list": shopping_list,
                "food_prep_tasks": food_preps,
                "linked_inventories": linked_inventories,
                "inventory_coverage": coverage,
            },
        });

        tool_json(&brief)
    }

    /// Schedules a recipe as a meal on an event after obtaining explicit user
    /// confirmation via MCP elicitation.
    #[tool(
        name = "add_meal_to_event",
        description = "Schedule a recipe as a meal on an event (requires human confirmation via elicitation before saving)."
    )]
    pub async fn add_meal_to_event(
        &self,
        Parameters(params): Parameters<AddMealToEventParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;

        // Pre-validate read access & resolve names so the elicitation prompt is clear and accurate.
        let event_details = match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
            Ok(d) => d,
            Err(err) => return map_app_error_to_tool(err),
        };
        let recipe = match self.state.recipes().get(params.recipe_id).await {
            Ok(r) if actor.ctx.can_access_group(r.group_id) => r,
            Ok(_) => {
                return map_app_error_to_tool(AppError::NotFound {
                    entity: "Recipe",
                    id: params.recipe_id.to_string(),
                });
            }
            Err(err) => return map_app_error_to_tool(err),
        };

        let summary = format!(
            "Confirm adding meal to event '{}' (ID {}):\n\
             - Recipe: '{}' (ID {})\n\
             - Start time: {}\n\
             - End time: {}\n\
             - Servings: {}\n\
             - Energy per serving: {} kJ\n\
             - Place ID: {}\n\
             - Comment: {}",
            event_details.event.name,
            params.event_id,
            recipe.name,
            params.recipe_id,
            params.start_time,
            params.end_time.as_deref().unwrap_or(&params.start_time),
            params.servings,
            params.energy_per_serving,
            params
                .place_id
                .map(|id| id.to_string())
                .unwrap_or_else(|| "default".into()),
            params.comment.as_deref().unwrap_or("(none)"),
        );

        match context.peer.elicit::<ConfirmMutation>(summary).await {
            Ok(Some(ConfirmMutation { confirmed: true })) => {}
            Ok(_) => {
                return Ok(CallToolResult::error(vec![ContentBlock::text(
                    "Operation aborted: user declined or dismissed confirmation to add the meal.",
                )]));
            }
            Err(err) => {
                return Ok(CallToolResult::error(vec![ContentBlock::text(format!(
                    "Operation aborted: elicitation confirmation could not be completed ({err})."
                ))]));
            }
        }

        let input = MealAddInput {
            recipe_id: params.recipe_id,
            place_id: params.place_id,
            start_time: params.start_time,
            end_time: params.end_time,
            energy_per_serving: params.energy_per_serving,
            servings: params.servings,
            comment: params.comment,
        };

        match meals::add_meal_to_event(&self.state, &actor, params.event_id, input).await {
            Ok(meal_id) => tool_json(&json!({
                "status": "created",
                "event_id": params.event_id,
                "meal_id": meal_id,
                "recipe_name": recipe.name,
            })),
            Err(err) => map_app_error_to_tool(err),
        }
    }

    /// Reschedules or moves a shopping tour to a different store after obtaining
    /// explicit user confirmation via MCP elicitation.
    #[tool(
        name = "update_shopping_tour",
        description = "Reschedule a shopping tour or change its store (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_shopping_tour(
        &self,
        Parameters(params): Parameters<UpdateShoppingTourParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;

        // Pre-validate event & tour visibility before eliciting confirmation.
        let event_details = match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
            Ok(d) => d,
            Err(err) => return map_app_error_to_tool(err),
        };
        let current_tour = match self.state.events().get_shopping_tour(params.tour_id).await {
            Ok(t) => t,
            Err(err) => return map_app_error_to_tool(err),
        };

        let summary = format!(
            "Confirm updating shopping tour #{} for event '{}' (ID {}):\n\
             - Current date: {} -> New date: {}\n\
             - Current store ID: {} -> New store ID: {}",
            params.tour_id,
            event_details.event.name,
            params.event_id,
            current_tour.tour_date,
            params.tour_date,
            current_tour.store_id,
            params.store_id,
        );

        match context.peer.elicit::<ConfirmMutation>(summary).await {
            Ok(Some(ConfirmMutation { confirmed: true })) => {}
            Ok(_) => {
                return Ok(CallToolResult::error(vec![ContentBlock::text(
                    "Operation aborted: user declined or dismissed confirmation to update the shopping tour.",
                )]));
            }
            Err(err) => {
                return Ok(CallToolResult::error(vec![ContentBlock::text(format!(
                    "Operation aborted: elicitation confirmation could not be completed ({err})."
                ))]));
            }
        }

        let input = TourInput {
            tour_date: params.tour_date,
            store_id: params.store_id,
        };

        map_tool_result(
            events::update_tour(&self.state, &actor, params.event_id, params.tour_id, input).await,
        )
    }
}