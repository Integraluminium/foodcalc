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
    /// Optional target budget as a decimal string (e.g. "350.00"). If omitted,
    /// the agent reads the budget from `get_event_catering_brief`.
    pub budget: Option<String>,
}

/// Parameters for the `audit_event_shopping` workflow prompt.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct AuditEventShoppingArgs {
    /// Numeric ID of the event whose shopping tours and inventory coverage should be audited.
    pub event_id: i32,
}

/// Parameters for the `import_recipe_from_text` workflow prompt.
#[derive(Debug, Deserialize, JsonSchema)]
pub struct ImportRecipeArgs {
    /// Numeric ID of the group that will own the imported recipe.
    pub group_id: i32,
    /// The source text (textbook excerpt, notes) to extract the recipe from.
    pub source_text: String,
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
             Dietary / allergen notes: {dietary}\n\
             Target budget: {budget}\n\n\
             Follow these steps:\n\
             1. Call `get_event_catering_brief` with `event_id = {event_id}` to inspect the event frame, \
                budget, already scheduled meals, total energy (kJ), and logistics.\n\
             2. Read `foodcalc://master/metadata` if you need unit IDs, allergen/property IDs, serving place IDs, or store IDs.\n\
             3. Use `search_recipes` (filter `recipe_type = \"meal\"`) and `get_recipe_scaled` to evaluate \
                candidate dishes, energy density (kJ/g), scaled ingredient quantities, and allergen tags.\n\
             4. Compose a balanced menu that satisfies the headcount and stays within the budget: \
                estimate each meal's ingredient cost from `get_recipe_scaled` scaled quantities and \
                `search_ingredients` sources; keep total energy sensible per attendee.\n\
             5. Present the complete proposal to the user (menu, servings, energy_per_serving per meal, \
                serving times, estimated total cost vs. budget).\n\
             6. Apply it with ONE call to `replace_event_meals` — the user confirms the full diff once. \
                For small revisions afterwards, use `add_meal_to_event` / `update_meal` / `remove_meal`.\n\
             7. After applying, call `get_event_catering_brief` again and report total_cost vs. budget \
                and any shopping-tour implications.",
            event_id = args.event_id,
            budget = args
                .budget
                .as_deref()
                .unwrap_or("(unknown — read from get_event_catering_brief)"),
        );

        Ok(
            GetPromptResult::new(vec![PromptMessage::new_text(Role::User, prompt_text)])
                .with_description(format!(
                    "Menu planning workflow for event #{}",
                    args.event_id
                )),
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

    /// Guided workflow to import a recipe from source text (textbook, notes).
    #[prompt(
        name = "import_recipe_from_text",
        description = "Extract a recipe from provided source text into a structured draft, import it, and review the report."
    )]
    pub async fn import_recipe_from_text(
        &self,
        Parameters(args): Parameters<ImportRecipeArgs>,
        context: RequestContext<RoleServer>,
    ) -> Result<GetPromptResult, McpError> {
        let _actor = auth::extract_actor(&context)?;

        let prompt_text = format!(
            "You are importing a recipe into Foodcalc for group #{group_id}.\n\
             Source text:\n{source}\n\n\
             Follow these steps:\n\
             1. Extract a structured draft from the text: recipe name, kind \
                (\"meal\" for a full dish, \"component\" for a sauce/side), \
                ingredient lines (name, decimal amount, unit as written), and \
                ordered preparation steps.\n\
             2. Read `foodcalc://master/metadata` to learn the available unit names — \
                normalize units to the catalog's spelling (e.g. \"g\", \"kg\", \"piece\").\n\
             3. Call `search_ingredients` for each ingredient name to check whether it \
                already exists in the catalog. If several near-matches exist, ask the \
                user which one to use rather than guessing.\n\
             4. Call `import_recipe` with the draft. Set `create_missing_ingredients = true` \
                ONLY if the user agreed to create new (draft) ingredients; otherwise leave \
                it unset so unknown names are reported instead.\n\
             5. Present the review report to the user: matched ingredients, created drafts \
                (they have zero energy and need weights — list them explicitly), unresolved \
                lines, and warnings.\n\
             6. Fix gaps with the fine-grained tools (`add_recipe_ingredient`, \
                `update_recipe`, `add_recipe_step`), each of which asks for confirmation.\n\
             7. Close with `get_recipe_scaled` on the imported recipe so the user can verify \
                the energy density is plausible for a textbook recipe.",
            group_id = args.group_id,
            source = args.source_text,
        );

        Ok(
            GetPromptResult::new(vec![PromptMessage::new_text(Role::User, prompt_text)])
                .with_description("Recipe import workflow from source text"),
        )
    }
}
