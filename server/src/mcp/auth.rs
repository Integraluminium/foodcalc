//! Authentication and actor-context bridge for the MCP Streamable HTTP endpoint.
//!
//! Supports `Authorization: Bearer fc_...` personal API tokens (primary for CLI/desktop
//! MCP clients) with automatic fallback to `axum-login` session cookies.

use axum::{
    extract::{FromRequestParts, Request},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response}, Json,
};
use foodlib_new::{auth_context::AuthCtx, FoodLib};
use rmcp::{service::RequestContext, ErrorData as McpError, RoleServer};
use serde_json::json;

use crate::app::{tokens, AppCtx, Channel};

/// Middleware guarding `/mcp`: authenticates via `Authorization: Bearer <token>`
/// when present, otherwise falls back to the browser session cookie, and attaches
/// `AppCtx` stamped with `Channel::McpAgent` to request extensions.
pub async fn require_mcp_auth(mut req: Request, next: Next) -> Response {
    let bearer_token = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|val| val.to_str().ok())
        .and_then(|val| {
            val.strip_prefix("Bearer ")
                .or_else(|| val.strip_prefix("bearer "))
        })
        .map(str::to_owned);

    let auth_result = if let Some(raw_token) = bearer_token {
        match req.extensions().get::<FoodLib>().cloned() {
            Some(foodlib) => tokens::authenticate_bearer_token(&foodlib, &raw_token).await,
            None => Err(foodlib_new::Error::Misc("FoodLib extension missing".into())),
        }
    } else {
        let (mut parts, body) = req.into_parts();
        let res = AuthCtx::from_request_parts(&mut parts, &()).await;
        req = Request::from_parts(parts, body);
        res
    };

    match auth_result {
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