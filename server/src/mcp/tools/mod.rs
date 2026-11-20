//! Modular MCP tool routers grouped by domain (`events`, `recipes`, `inventory`).

pub mod events;
pub mod inventory;
pub mod recipes;

use rmcp::{
    handler::server::router::tool::ToolRouter,
    model::{CallToolResult, ContentBlock},
    service::RequestContext,
    RoleServer,
};

use crate::app::{risk, AppCtx, AuthMethod, MyAppState};
use crate::mcp::{ConfirmMutation, FoodcalcMcpServer};

/// Combines all domain tool routers into a single router for [`FoodcalcMcpServer`].
pub fn combined_tool_router() -> ToolRouter<FoodcalcMcpServer> {
    FoodcalcMcpServer::events_tool_router()
        + FoodcalcMcpServer::recipes_tool_router()
        + FoodcalcMcpServer::inventory_tool_router()
}

/// Capability gate for MCP tools: resolves the tool's risk class and checks
/// it against the actor's token capability profile. Returns `None` when
/// allowed, or `Some(CallToolResult)` with an actionable `PermissionDenied`
/// error the LLM can relay to the user (recoverable: fixing the token
/// profile in the settings UI is a user action, not a protocol failure).
///
/// Session-cookie (human) actors are always unrestricted — profiles exist to
/// scope automation credentials only.
pub fn check_tool_allowed(actor: &AppCtx, tool_name: &str) -> Option<CallToolResult> {
    let class = risk::class_of_tool(tool_name);
    if actor.is_risk_class_allowed(class) {
        return None;
    }
    let AuthMethod::PersonalApiToken {
        token_name,
        allowed_risk_classes: Some(classes),
        ..
    } = &actor.auth
    else {
        // Unreachable: unrestricted actors pass `is_risk_class_allowed`.
        return None;
    };
    Some(CallToolResult::error(vec![ContentBlock::text(format!(
        "PermissionDenied: your API token '{token_name}' is not permitted to perform '{class}' \
         operations (allowed classes: {}). Ask the user to add the '{class}' class to this token \
         in the settings UI, or to use a token with the required capabilities.",
        classes.join(", ")
    ))]))
}

/// Shared human-in-the-loop gate for mutating tools.
///
/// Presents `summary` to the human via MCP elicitation. Returns `None` only
/// when the human explicitly confirmed. On decline/dismissal or on an
/// elicitation transport failure it returns `Some(CallToolResult)` with an
/// error payload the LLM can surface (fail-closed: no write happens) — as a
/// *successful* tool result, since a declined confirmation is a recoverable
/// domain outcome, not a protocol failure.
///
/// The elicitation outcome is audited (`mcp.elicitation.rejected`), so the
/// audit trail shows not only performed writes but also exercised (and
/// refused) confirmation gates.
pub async fn confirm_or_abort(
    state: &MyAppState,
    actor: &AppCtx,
    context: &RequestContext<RoleServer>,
    tool_name: &str,
    summary: String,
) -> Option<CallToolResult> {
    match context.peer.elicit::<ConfirmMutation>(summary).await {
        Ok(Some(ConfirmMutation { confirmed: true })) => None,
        Ok(_) => {
            audit_elicitation_rejection(state, actor, tool_name, "declined").await;
            Some(CallToolResult::error(vec![ContentBlock::text(format!(
                "Operation aborted: user declined or dismissed confirmation to run '{tool_name}'."
            ))]))
        }
        Err(err) => {
            audit_elicitation_rejection(state, actor, tool_name, "elicit_unavailable").await;
            Some(CallToolResult::error(vec![ContentBlock::text(format!(
                "Operation aborted: elicitation confirmation for '{tool_name}' could not be \
                 completed ({err})."
            ))]))
        }
    }
}

/// Best-effort audit entry for a refused/exercised elicitation gate.
async fn audit_elicitation_rejection(
    state: &MyAppState,
    actor: &AppCtx,
    tool_name: &str,
    outcome: &'static str,
) {
    crate::app::audit::record(
        state,
        actor,
        "mcp.elicitation.rejected",
        None,
        None,
        None,
        None,
        Some(serde_json::json!({ "tool": tool_name, "outcome": outcome })),
    )
    .await;
}

/// Human-readable attribution line for elicitation summaries: shows the user
/// and the credential (session or named API token) that is acting, so the
/// human knows who is requesting the change.
pub fn actor_attribution(actor: &AppCtx) -> String {
    format!(
        "Requested by MCP agent of user '{}' ({}).",
        actor.ctx.user.username,
        actor.auth_description()
    )
}
