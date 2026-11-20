//! Catering workflow prompt templates exposed via MCP (`#[prompt]`).

use rmcp::{
    handler::server::wrapper::Parameters,
    model::{GetPromptResult, PromptMessage, Role},
    prompt, prompt_router,
    schemars::JsonSchema,
    service::RequestContext,
    ErrorData as McpError, RoleServer,
};
use serde::Deserialize;

use crate::mcp::{auth, FoodcalcMcpServer};

/// Parameters for the `plan_event_menu` workflow prompt.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct PlanEventMenuArgs {
    /// Numeric ID of the target event to plan meals for.
    pub event_id: i32,
    /// Optional dietary or allergen constraints to respect (e.g. "vegetarian, nut-free").
    pub dietary_notes: Option<String>,
}

/// Parameters for the `audit_event_shopping` workflow prompt.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct AuditEventShoppingArgs {
    /// Numeric ID of the event whose shopping tours and inventory coverage should be audited.
    pub event_id: i32,
}

#[prompt_router(vis = "pub")]
impl FoodcalcMcpServer {
    /// Guided multi-step workflow to inspect an event, search compatible recipes,
    /// check scaled portions and allergens, and propose new meals (confirmed via elicitation).
    #[prompt(
        name = "plan_event_menu",
        description = "Analyze an event's schedule, headcount, and budget, search suitable recipes, and propose a balanced menu."
    )]
    pub async fn plan_event_menu(
        &self,
        Parameters(args): Parameters<PlanEventMenuArgs>,
        context: RequestContext<RoleServer>,
    ) -> Result<GetPromptResult, McpError> {
        let _actor = auth::extract_actor(&context)?;
        let dietary = args
            .dietary_notes
            .unwrap_or_else(|| "none specified".into());

        let prompt_text = format!(
            "You are assisting with menu planning for Foodcalc event #{event_id}.\n\
             Dietary / allergen notes: {dietary}\n\n\
             Follow these steps:\n\
             1. Call `get_event_catering_brief` with `event_id = {event_id}` to inspect the event frame, \
                budget, already scheduled meals, total energy (kJ), and logistics.\n\
             2. Read `foodcalc://master/metadata` if you need unit IDs, allergen/property IDs, or serving place IDs.\n\
             3. Use `search_recipes` (filter `recipe_type = \"meal\"`) and `get_recipe_scaled` to evaluate \
                candidate dishes, energy density (kJ/g), scaled ingredient quantities, and allergen tags.\n\
             4. Present a concrete menu proposal with target servings, energy_per_serving (kJ), and serving times.\n\
             5. Only call `add_meal_to_event` after explaining your proposal; the server will trigger human-in-the-loop \
                elicitation confirmation before writing to the database.",
            event_id = args.event_id,
        );

        Ok(
            GetPromptResult::new(vec![PromptMessage::new_text(Role::User, prompt_text)])
                .with_description(format!("Menu planning workflow for event #{}", args.event_id)),
        )
    }

    /// Guided workflow to audit an event's shopping tours, unassigned ingredients,
    /// and linked inventory stock coverage.
    #[prompt(
        name = "audit_event_shopping",
        description = "Audit an event's shopping tours, unassigned ingredients, and inventory stock coverage."
    )]
    pub async fn audit_event_shopping(
        &self,
        Parameters(args): Parameters<AuditEventShoppingArgs>,
        context: RequestContext<RoleServer>,
    ) -> Result<GetPromptResult, McpError> {
        let _actor = auth::extract_actor(&context)?;

        let prompt_text = format!(
            "Perform a procurement and logistics audit for Foodcalc event #{event_id}.\n\n\
             Follow these steps:\n\
             1. Call `get_event_catering_brief` with `event_id = {event_id}` to inspect scheduled shopping tours, \
                tour completion locks, ingredients without a tour, and inventory coverage.\n\
             2. Call `get_inventory_overview` to inspect available stock in linked inventories.\n\
             3. Read `foodcalc://master/metadata` to resolve `store_id` and `unit_id` names.\n\
             4. Report:\n\
                - Any ingredients currently in `without_tour` that lack a scheduled shopping tour.\n\
                - Tour dates that fall after the earliest meal requiring those ingredients.\n\
                - Budget comparison (`total_cost` vs. event `budget`) and items missing price sources.\n\
                - Stock surpluses from linked inventories that can reduce shopping quantities.\n\
             5. If a shopping tour needs rescheduling or store reassignment, propose the exact change and use \
                `update_shopping_tour` (which will request user confirmation via elicitation).",
            event_id = args.event_id,
        );

        Ok(
            GetPromptResult::new(vec![PromptMessage::new_text(Role::User, prompt_text)])
                .with_description(format!(
                    "Shopping & logistics audit for event #{}",
                    args.event_id
                )),
        )
    }
}