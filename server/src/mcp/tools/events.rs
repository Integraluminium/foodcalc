//! Event & logistics MCP tools (read-only composite briefs + elicitation-guarded mutations).

use bigdecimal::ToPrimitive;
use foodlib_new::entities::meal::PlannerMeal;
use rmcp::{
    handler::server::wrapper::Parameters, model::CallToolResult, schemars::JsonSchema,
    service::RequestContext, tool, tool_router, ErrorData as McpError, RoleServer,
};
use serde::Deserialize;
use serde_json::json;

use super::{actor_attribution, confirm_or_abort};
use crate::app::{
    events::{
        self,
        logistics::{inventory_coverage, list_event_inventories, list_food_preps},
        meals::{self, MealAddInput, MealUpdateInput},
        EventCreateInput, EventUpdateInput, TourInput,
    },
    Error as AppError,
};
use crate::mcp::{
    auth::extract_actor,
    error::{map_app_error_to_tool, map_tool_result, tool_json},
    FoodcalcMcpServer,
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

/// Parameters for `create_shopping_tour` (requires human-in-the-loop elicitation confirmation).
#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateShoppingTourParams {
    /// Numeric ID of the event the tour belongs to.
    pub event_id: i32,
    /// Shopping tour timestamp in RFC 3339 format (e.g. `"2026-10-14T09:00:00Z"`).
    pub tour_date: String,
    /// Numeric ID of the store for this shopping tour.
    pub store_id: i32,
}

/// Parameters for `add_shopping_tour_item` (requires human-in-the-loop elicitation confirmation).
#[derive(Debug, Deserialize, JsonSchema)]
pub struct AddShoppingTourItemParams {
    /// Numeric ID of the event owning the shopping tour.
    pub event_id: i32,
    /// Numeric ID of the shopping tour to pin the ingredient onto.
    pub tour_id: i32,
    /// Numeric ID of the ingredient to pin onto this tour.
    pub ingredient_id: i32,
}

/// Parameters for `create_event` (requires human-in-the-loop elicitation confirmation).
#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateEventParams {
    pub name: String,
    pub comment: Option<String>,
    /// Budget as a decimal string (e.g. `"350.00"`); omit for no budget.
    pub budget: Option<String>,
    /// Numeric ID of the group that will own the event.
    pub group_id: i32,
}

/// Parameters for `get_event`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetEventParams {
    pub event_id: i32,
}

/// Parameters for `get_shopping_list`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetShoppingListParams {
    pub event_id: i32,
}

/// Parameters for `update_event` (requires human-in-the-loop elicitation confirmation).
/// Omitted fields keep their current value; empty strings clear comment/budget.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct UpdateEventParams {
    pub event_id: i32,
    pub name: Option<String>,
    pub comment: Option<String>,
    pub budget: Option<String>,
}

/// One planned meal of a full-event plan.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct MealSpec {
    /// Numeric ID of the recipe to serve.
    pub recipe_id: i32,
    /// Meal start timestamp in RFC 3339 format.
    pub start_time: String,
    /// Optional end timestamp (defaults to start_time).
    pub end_time: Option<String>,
    /// Planned energy per portion in kJ as a decimal string.
    pub energy_per_serving: String,
    /// Planned number of portions / attendees.
    pub servings: i32,
    /// Optional serving place; defaults to the event's first configured place.
    pub place_id: Option<i32>,
    pub comment: Option<String>,
}

/// One meal of a full-event plan that updates an existing meal.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct MealSpecUpdate {
    /// Numeric ID of the existing meal to replace with this spec.
    pub meal_id: i32,
    #[serde(flatten)]
    pub spec: MealSpec,
}

/// Parameters for `replace_event_meals` — the whole-plan write (requires a
/// single diff-confirmation). Meals referenced in `update` are rewritten,
/// meals in `add` are created, and every *current* meal whose id is not
/// referenced in `update` is removed.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReplaceEventMealsParams {
    pub event_id: i32,
    /// New meals to create.
    pub add: Vec<MealSpec>,
    /// Existing meals to rewrite in place (identified by `meal_id`).
    pub update: Vec<MealSpecUpdate>,
}

/// Parameters for `update_meal`. Omitted fields keep their values; an empty
/// comment clears it.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct UpdateMealParams {
    pub event_id: i32,
    pub meal_id: i32,
    pub recipe_id: Option<i32>,
    pub place_id: Option<i32>,
    /// RFC 3339 timestamp (e.g. `"2026-10-15T12:00:00Z"`).
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    /// Planned energy per portion in kJ as a decimal string.
    pub energy_per_serving: Option<String>,
    pub servings: Option<i32>,
    pub comment: Option<String>,
}

/// Parameters for `remove_meal`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct RemoveMealParams {
    pub event_id: i32,
    pub meal_id: i32,
}

/// Parameters for `duplicate_meal`.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct DuplicateMealParams {
    pub event_id: i32,
    pub meal_id: i32,
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
        if let Some(denied) = super::check_tool_allowed(&actor, "list_events") {
            return Ok(denied);
        }
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
        if let Some(denied) = super::check_tool_allowed(&actor, "get_event_catering_brief") {
            return Ok(denied);
        }
        let event_id = params.event_id;

        let details = match events::get_event_details(&self.state, &actor.ctx, event_id).await {
            Ok(d) => d,
            Err(err) => return map_app_error_to_tool(err),
        };

        let (planner_meals, shopping_list, food_preps, linked_inventories, coverage) = match tokio::try_join!(
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
        let max_meal_servings: i32 = planner_meals.iter().map(|m| m.servings).max().unwrap_or(0);
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
        if let Some(denied) = super::check_tool_allowed(&actor, "add_meal_to_event") {
            return Ok(denied);
        }

        // Pre-validate read access & resolve names so the elicitation prompt is clear and accurate.
        let event_details =
            match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
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
            "{}\nConfirm adding meal to event '{}' (ID {}):\n\
             - Recipe: '{}' (ID {})\n\
             - Start time: {}\n\
             - End time: {}\n\
             - Servings: {}\n\
             - Energy per serving: {} kJ\n\
             - Place ID: {}\n\
             - Comment: {}",
            actor_attribution(&actor),
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

        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "add_meal_to_event", summary).await
        {
            return Ok(aborted);
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
        if let Some(denied) = super::check_tool_allowed(&actor, "update_shopping_tour") {
            return Ok(denied);
        }

        // Pre-validate event & tour visibility before eliciting confirmation.
        let event_details =
            match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
                Ok(d) => d,
                Err(err) => return map_app_error_to_tool(err),
            };
        let current_tour = match self.state.events().get_shopping_tour(params.tour_id).await {
            Ok(t) => t,
            Err(err) => return map_app_error_to_tool(err),
        };
        // Reject tours of other events *before* eliciting confirmation so a
        // wrong tour_id cannot surface another event's tour data to the user.
        if current_tour.event_id != params.event_id {
            return map_app_error_to_tool(AppError::Validation {
                message: format!(
                    "tour {tour} does not belong to event {event}",
                    tour = params.tour_id,
                    event = params.event_id,
                ),
            });
        }

        let summary = format!(
            "{}\nConfirm updating shopping tour #{} for event '{}' (ID {}):\n\
             - Current date: {} -> New date: {}\n\
             - Current store ID: {} -> New store ID: {}",
            actor_attribution(&actor),
            params.tour_id,
            event_details.event.name,
            params.event_id,
            current_tour.tour_date,
            params.tour_date,
            current_tour.store_id,
            params.store_id,
        );

        if let Some(aborted) = confirm_or_abort(
            &self.state,
            &actor,
            &context,
            "update_shopping_tour",
            summary,
        )
        .await
        {
            return Ok(aborted);
        }

        let input = TourInput {
            tour_date: params.tour_date,
            store_id: params.store_id,
        };

        map_tool_result(
            events::update_tour(&self.state, &actor, params.event_id, params.tour_id, input).await,
        )
    }

    /// Schedules a new shopping tour for an event after obtaining explicit
    /// user confirmation via MCP elicitation.
    #[tool(
        name = "create_shopping_tour",
        description = "Schedule a new shopping tour for an event at a store; ingredients sourced from that store with a matching buy-by window are assigned automatically (requires human confirmation via elicitation before saving)."
    )]
    pub async fn create_shopping_tour(
        &self,
        Parameters(params): Parameters<CreateShoppingTourParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "create_shopping_tour") {
            return Ok(denied);
        }

        // Pre-validate event visibility before eliciting confirmation.
        let event_details =
            match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
                Ok(d) => d,
                Err(err) => return map_app_error_to_tool(err),
            };

        let summary = format!(
            "{}\nConfirm creating a shopping tour for event '{}' (ID {}):\n\
             - Date: {}\n\
             - Store ID: {}",
            actor_attribution(&actor),
            event_details.event.name,
            params.event_id,
            params.tour_date,
            params.store_id,
        );

        if let Some(aborted) = confirm_or_abort(
            &self.state,
            &actor,
            &context,
            "create_shopping_tour",
            summary,
        )
        .await
        {
            return Ok(aborted);
        }

        let input = TourInput {
            tour_date: params.tour_date,
            store_id: params.store_id,
        };
        map_tool_result(events::add_tour(&self.state, &actor, params.event_id, input).await)
    }

    /// Pins an ingredient onto a shopping tour after obtaining explicit user
    /// confirmation via MCP elicitation.
    #[tool(
        name = "add_shopping_tour_item",
        description = "Pin an ingredient onto a shopping tour, overriding the automatic store/date-window assignment (requires human confirmation via elicitation before saving)."
    )]
    pub async fn add_shopping_tour_item(
        &self,
        Parameters(params): Parameters<AddShoppingTourItemParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "add_shopping_tour_item") {
            return Ok(denied);
        }

        // Pre-validate event & tour visibility before eliciting confirmation.
        match events::get_event_details(&self.state, &actor.ctx, params.event_id).await {
            Ok(_) => {}
            Err(err) => return map_app_error_to_tool(err),
        }
        let current_tour = match self.state.events().get_shopping_tour(params.tour_id).await {
            Ok(t) => t,
            Err(err) => return map_app_error_to_tool(err),
        };
        if current_tour.event_id != params.event_id {
            return map_app_error_to_tool(AppError::Validation {
                message: format!(
                    "tour {tour} does not belong to event {event}",
                    tour = params.tour_id,
                    event = params.event_id,
                ),
            });
        }

        let summary = format!(
            "{}\nConfirm pinning ingredient #{} onto shopping tour #{} of event '{}' (ID {}):",
            actor_attribution(&actor),
            params.ingredient_id,
            params.tour_id,
            current_tour.tour_date,
            params.event_id,
        );

        if let Some(aborted) = confirm_or_abort(
            &self.state,
            &actor,
            &context,
            "add_shopping_tour_item",
            summary,
        )
        .await
        {
            return Ok(aborted);
        }

        map_tool_result(
            events::add_tour_item(
                &self.state,
                &actor,
                params.event_id,
                params.tour_id,
                params.ingredient_id,
            )
            .await,
        )
    }

    /// Fetches an event's frame data, planned meals, total cost and the
    /// caller's resolved permissions.
    #[tool(
        name = "get_event",
        description = "Get an event's frame data (name, comment, budget, group), planned meals, total cost, and the caller's resolved permissions for the event."
    )]
    pub async fn get_event(
        &self,
        Parameters(params): Parameters<GetEventParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "get_event") {
            return Ok(denied);
        }
        map_tool_result(events::get_event_details(&self.state, &actor.ctx, params.event_id).await)
    }

    /// Fetches the event's shopping list grouped by tour plus uncovered
    /// ingredients.
    #[tool(
        name = "get_shopping_list",
        description = "Get an event's shopping list: tours with items and tour totals, plus ingredients not yet covered by any tour."
    )]
    pub async fn get_shopping_list(
        &self,
        Parameters(params): Parameters<GetShoppingListParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "get_shopping_list") {
            return Ok(denied);
        }
        map_tool_result(events::get_shopping_list(&self.state, &actor.ctx, params.event_id).await)
    }

    /// Creates an event.
    #[tool(
        name = "create_event",
        description = "Create a catering event owned by one of your groups, optionally with a budget (requires human confirmation via elicitation before saving)."
    )]
    pub async fn create_event(
        &self,
        Parameters(params): Parameters<CreateEventParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "create_event") {
            return Ok(denied);
        }
        let summary = format!(
            "{}\nConfirm creating event '{}' in group {} with budget {}.",
            actor_attribution(&actor),
            params.name,
            params.group_id,
            params.budget.as_deref().unwrap_or("(none)"),
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "create_event", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(
            events::create_new_event(
                &self.state,
                &actor,
                EventCreateInput {
                    name: params.name,
                    comment: params.comment,
                    budget: params.budget,
                    group_id: params.group_id,
                },
            )
            .await,
        )
    }

    /// Updates the event frame (name/comment/budget).
    #[tool(
        name = "update_event",
        description = "Update an event's frame data: name, comment (empty string clears it), or budget (empty string clears it). Omitted fields keep their values (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_event(
        &self,
        Parameters(params): Parameters<UpdateEventParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_event") {
            return Ok(denied);
        }
        let summary = format!(
            "{}\nConfirm updating event #{}: name {:?}, comment {:?}, budget {}.",
            actor_attribution(&actor),
            params.event_id,
            params.name,
            params.comment,
            params.budget.as_deref().unwrap_or("(unchanged)"),
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "update_event", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(
            events::update_event(
                &self.state,
                &actor,
                params.event_id,
                EventUpdateInput {
                    name: params.name,
                    comment: params.comment,
                    budget: params.budget,
                },
            )
            .await,
        )
    }

    /// Updates a planned meal (provided fields win).
    #[tool(
        name = "update_meal",
        description = "Update a planned meal on an event: recipe, place, times, energy per serving (kJ), servings, or comment (empty string clears it). Omitted fields keep their values (requires human confirmation via elicitation before saving)."
    )]
    pub async fn update_meal(
        &self,
        Parameters(params): Parameters<UpdateMealParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "update_meal") {
            return Ok(denied);
        }
        let current = match self.state.meals().get_meal(params.meal_id).await {
            Ok(meal) if meal.event_id == params.event_id => meal,
            Ok(_) => {
                return map_app_error_to_tool(AppError::Validation {
                    message: format!(
                        "meal {} does not belong to event {}",
                        params.meal_id, params.event_id
                    ),
                })
            }
            Err(err) => return map_app_error_to_tool(err),
        };
        let summary = format!(
            "{}\nConfirm updating meal #{} of event #{}:\n\
             - Recipe ID: {} -> {}\n\
             - Start: {} -> {}\n\
             - End: {} -> {}\n\
             - Servings: {} -> {}\n\
             - Total energy: {} -> {} kJ",
            actor_attribution(&actor),
            params.meal_id,
            params.event_id,
            current.recipe_id,
            params
                .recipe_id
                .map(|v| v.to_string())
                .unwrap_or_else(|| "(unchanged)".into()),
            current.start_time,
            params.start_time.as_deref().unwrap_or("(unchanged)"),
            current.end_time,
            params.end_time.as_deref().unwrap_or("(unchanged)"),
            current.servings,
            params
                .servings
                .map(|v| v.to_string())
                .unwrap_or_else(|| "(unchanged)".into()),
            current.energy,
            params
                .energy_per_serving
                .as_deref()
                .unwrap_or("(unchanged)"),
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "update_meal", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(
            meals::update_meal_of_event(
                &self.state,
                &actor,
                params.event_id,
                params.meal_id,
                MealUpdateInput {
                    recipe_id: params.recipe_id,
                    place_id: params.place_id,
                    start_time: params.start_time,
                    end_time: params.end_time,
                    energy_per_serving: params.energy_per_serving,
                    servings: params.servings,
                    comment: params.comment,
                },
            )
            .await
            .map(|_| json!({ "status": "updated", "meal_id": params.meal_id })),
        )
    }

    /// Removes a planned meal.
    #[tool(
        name = "remove_meal",
        description = "Remove (unplan) a meal from an event (requires human confirmation via elicitation before saving)."
    )]
    pub async fn remove_meal(
        &self,
        Parameters(params): Parameters<RemoveMealParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "remove_meal") {
            return Ok(denied);
        }
        let summary = format!(
            "{}\nConfirm removing meal #{} from event #{}.",
            actor_attribution(&actor),
            params.meal_id,
            params.event_id,
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "remove_meal", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(
            meals::remove_meal_from_event(&self.state, &actor, params.event_id, params.meal_id)
                .await
                .map(|_| json!({ "status": "removed", "meal_id": params.meal_id })),
        )
    }

    /// Duplicates a planned meal within the event.
    #[tool(
        name = "duplicate_meal",
        description = "Duplicate a planned meal within the same event (requires human confirmation via elicitation before saving)."
    )]
    pub async fn duplicate_meal(
        &self,
        Parameters(params): Parameters<DuplicateMealParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "duplicate_meal") {
            return Ok(denied);
        }
        let summary = format!(
            "{}\nConfirm duplicating meal #{} of event #{}.",
            actor_attribution(&actor),
            params.meal_id,
            params.event_id,
        );
        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "duplicate_meal", summary).await
        {
            return Ok(aborted);
        }
        map_tool_result(
            meals::duplicate_meal_within_event(
                &self.state,
                &actor,
                params.event_id,
                params.meal_id,
            )
            .await
            .map(|id| json!({ "status": "created", "new_meal_id": id })),
        )
    }

    /// Applies a whole-event plan with a single diff-confirmation.
    #[tool(
        name = "replace_event_meals",
        description = "Apply a complete meal plan for an event with ONE confirmation: creates the meals in 'add', rewrites the meals in 'update' (by meal_id), and removes every existing meal NOT referenced in 'update'. The confirmation dialog shows the full diff (requires human confirmation via elicitation before saving)."
    )]
    pub async fn replace_event_meals(
        &self,
        Parameters(params): Parameters<ReplaceEventMealsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, McpError> {
        let actor = extract_actor(&context)?;
        if let Some(denied) = super::check_tool_allowed(&actor, "replace_event_meals") {
            return Ok(denied);
        }

        let current = match meals::list(&self.state, &actor.ctx, params.event_id).await {
            Ok(list) => list,
            Err(err) => return map_app_error_to_tool(err),
        };
        let update_ids: Vec<i32> = params.update.iter().map(|m| m.meal_id).collect();
        let removed: Vec<&PlannerMeal> = current
            .iter()
            .filter(|meal| !update_ids.contains(&meal.meal_id))
            .collect();

        let mut diff = format!(
            "{}\nConfirm the complete meal plan for event #{}:\n",
            actor_attribution(&actor),
            params.event_id
        );
        for meal in &params.add {
            diff.push_str(&format!(
                "  + CREATE recipe #{} at {} for {} guests ({} kJ/serving)\n",
                meal.recipe_id, meal.start_time, meal.servings, meal.energy_per_serving
            ));
        }
        for meal in &params.update {
            diff.push_str(&format!(
                "  ~ REWRITE meal #{} -> recipe #{} at {} for {} guests ({} kJ/serving)\n",
                meal.meal_id,
                meal.spec.recipe_id,
                meal.spec.start_time,
                meal.spec.servings,
                meal.spec.energy_per_serving
            ));
        }
        for meal in &removed {
            diff.push_str(&format!(
                "  - REMOVE meal #{} (recipe #{}, {})\n",
                meal.meal_id, meal.recipe_id, meal.name
            ));
        }
        if params.add.is_empty() && params.update.is_empty() && removed.is_empty() {
            diff.push_str("  (no changes)\n");
        }
        diff.push_str("This applies ALL listed changes in one step.");

        if let Some(aborted) =
            confirm_or_abort(&self.state, &actor, &context, "replace_event_meals", diff).await
        {
            return Ok(aborted);
        }

        // Apply: removals first (freeing the schedule), then rewrites, then
        // creates. Each write is individually audited by the app layer.
        for meal in &removed {
            if let Err(err) =
                meals::remove_meal_from_event(&self.state, &actor, params.event_id, meal.meal_id)
                    .await
            {
                return map_app_error_to_tool(err);
            }
        }
        for spec in &params.update {
            if let Err(err) = meals::update_meal_of_event(
                &self.state,
                &actor,
                params.event_id,
                spec.meal_id,
                spec_to_update_input(&spec.spec),
            )
            .await
            {
                return map_app_error_to_tool(err);
            }
        }
        let mut created_ids = Vec::with_capacity(params.add.len());
        for spec in &params.add {
            match meals::add_meal_to_event(
                &self.state,
                &actor,
                params.event_id,
                spec_to_add_input(spec),
            )
            .await
            {
                Ok(id) => created_ids.push(id),
                Err(err) => return map_app_error_to_tool(err),
            }
        }

        tool_json(&json!({
            "status": "applied",
            "event_id": params.event_id,
            "created_meal_ids": created_ids,
            "updated_meal_ids": update_ids,
            "removed_meal_ids": removed.iter().map(|m| m.meal_id).collect::<Vec<_>>(),
        }))
    }
}

/// Converts a plan spec into a create-meal input.
fn spec_to_add_input(spec: &MealSpec) -> MealAddInput {
    MealAddInput {
        recipe_id: spec.recipe_id,
        place_id: spec.place_id,
        start_time: spec.start_time.clone(),
        end_time: spec.end_time.clone(),
        energy_per_serving: spec.energy_per_serving.clone(),
        servings: spec.servings,
        comment: spec.comment.clone(),
    }
}

/// Converts a plan spec into a full-replace update-meal input.
fn spec_to_update_input(spec: &MealSpec) -> MealUpdateInput {
    MealUpdateInput {
        recipe_id: Some(spec.recipe_id),
        place_id: spec.place_id,
        start_time: Some(spec.start_time.clone()),
        end_time: spec.end_time.clone(),
        energy_per_serving: Some(spec.energy_per_serving.clone()),
        servings: Some(spec.servings),
        comment: spec.comment.clone(),
    }
}
