//! Authentication and actor-context bridge for the MCP Streamable HTTP endpoint.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use foodlib_new::auth_context::AuthCtx;
use rmcp::{service::RequestContext, ErrorData as McpError, RoleServer};
use serde_json::json;

use crate::app::{AppCtx, Channel};

/// Middleware guarding `/mcp`: validates the authenticated user session via
/// `AuthCtx` and inserts `AppCtx` stamped with `Channel::McpAgent` into the
/// HTTP request extensions (which `rmcp` propagates into `RequestContext`).
pub async fn require_mcp_auth(
    auth_ctx: std::result::Result<AuthCtx, foodlib_new::Error>,
    mut req: Request,
    next: Next,
) -> Response {
    match auth_ctx {
        Ok(ctx) => {
            let actor = AppCtx::new(ctx, Channel::McpAgent);
            req.extensions_mut().insert(actor);
            next.run(req).await
        }
        Err(foodlib_new::Error::Unauthorized(_)) | Err(foodlib_new::Error::UserNotFound { .. }) => {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "authentication required" })),
            )
                .into_response()
        }
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": err.to_string() })),
        )
            .into_response(),
    }
}

/// Extracts the authenticated [`AppCtx`] (`Channel::McpAgent`) from an `rmcp`
/// [`RequestContext`].
pub fn extract_actor(context: &RequestContext<RoleServer>) -> Result<AppCtx, McpError> {
    context
        .extensions
        .get::<AppCtx>()
        .cloned()
        .or_else(|| {
            context
                .extensions
                .get::<axum::http::request::Parts>()
                .and_then(|parts| parts.extensions.get::<AppCtx>())
                .cloned()
        })
        .ok_or_else(|| {
            McpError::internal_error(
                "missing authenticated MCP actor context on request",
                None,
            )
        })
}