//! Transport-agnostic application (use-case) layer.
//!
//! Use-cases here bundle the permission checks (`AuthCtx`), business
//! validation, `foodlib_new` orchestration and audit logging that used to
//! live inline in the `api` handlers. HTTP handlers in `api` stay thin
//! (extraction + serialization); the `mcp` transport calls these functions
//! directly instead of duplicating any of that logic.
//!
//! Error type is `foodlib_new::Error` on purpose: it is transport-agnostic
//! (`api::map_api_error` maps it to HTTP status codes, the frontend's
//! `html_error` maps it to HTML) — no second error enum needed.

pub mod audit;
pub mod auth;
pub mod events;
pub mod ingredients;
pub(crate) mod inventories;
mod lib;
pub mod master;
pub mod recipes;
pub mod risk;
pub mod state;
pub mod status_board;
pub(crate) mod tokens;
pub mod users;

pub use foodlib_new::error::{Error, Result};
pub use state::MyAppState;

use foodlib_new::auth_context::AuthCtx;
use foodlib_new::policy::Permission;

/// Transport through which a request reached the application layer.
/// Recorded in the audit log so human and automation actions are
/// distinguishable.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Channel {
    /// HTMX/maud frontend.
    WebUi,
    /// `/api/*` JSON endpoints (SPA).
    RestApi,
    /// MCP transport — treated as automation.
    McpAgent,
}

impl Channel {
    pub fn as_str(self) -> &'static str {
        match self {
            Channel::WebUi => "web-ui",
            Channel::RestApi => "rest-api",
            Channel::McpAgent => "mcp-agent",
        }
    }
}

/// How the request authenticated. Recorded in the audit trail so human
/// sessions, API tokens and (future) OAuth identities are distinguishable.
#[derive(Clone, Debug)]
pub enum AuthMethod {
    /// axum-login browser session cookie.
    SessionCookie,
    /// Personal API token (`Authorization: Bearer fc_...`), typically used
    /// by CLI/desktop MCP clients (automation). Carries the token identity
    /// and its optional capability profile (`None` = unrestricted).
    PersonalApiToken {
        token_id: i64,
        token_name: String,
        /// Restricted tool risk classes; `None` = all classes permitted.
        allowed_risk_classes: Option<Vec<String>>,
    },
}

/// An authenticated actor: the resolved `AuthCtx`, the channel it came in
/// on and how it authenticated.
#[derive(Clone, Debug)]
pub struct AppCtx {
    pub ctx: AuthCtx,
    pub channel: Channel,
    pub auth: AuthMethod,
}

impl AppCtx {
    pub fn new(ctx: AuthCtx, channel: Channel) -> Self {
        Self {
            ctx,
            channel,
            auth: AuthMethod::SessionCookie,
        }
    }

    /// Sets the authentication method (Bearer-token MCP requests attach the
    /// token identity and capability profile for audit + tool gating).
    pub fn with_auth(mut self, auth: AuthMethod) -> Self {
        self.auth = auth;
        self
    }

    /// Whether this actor may execute tools of `risk_class` under its
    /// capability profile. Session-cookie (human) actors are unrestricted —
    /// the profile mechanism exists to scope automation credentials.
    pub fn is_risk_class_allowed(&self, risk_class: &str) -> bool {
        match &self.auth {
            AuthMethod::PersonalApiToken {
                allowed_risk_classes: Some(classes),
                ..
            } => classes.iter().any(|c| c == risk_class),
            _ => true,
        }
    }

    /// Human-readable description of the credential for elicitation
    /// summaries and audit details.
    pub fn auth_description(&self) -> String {
        match &self.auth {
            AuthMethod::SessionCookie => "browser session".into(),
            AuthMethod::PersonalApiToken { token_name, .. } => {
                format!("API token '{token_name}'")
            }
        }
    }

    /// Rejects automation channels (MCP) for sensitive use-cases.
    /// Defense-in-depth alongside the future MCP tool allowlist: even if a
    /// tool were (accidentally) wired to a sensitive use-case, the call
    /// fails here. (Unused until the MCP transport lands.)
    #[allow(dead_code)]
    pub fn require_human(&self) -> Result<()> {
        if self.channel == Channel::McpAgent {
            return Err(Error::Forbidden(
                "this action is not available to automation (MCP); use the web UI".into(),
            ));
        }
        Ok(())
    }
}

/// Shared Besitz-Übertragung (ownership transfer) checks for events,
/// recipes and ingredients:
///
/// 1. no reflexive transfer,
/// 2. transfer rights (`perm`) on the *current* owner group,
/// 3. membership in the target group,
/// 4. transfer rights on the target group.
pub(crate) fn assert_ownership_transfer(
    ctx: &AuthCtx,
    what: &str,
    current_group_id: i32,
    target_group_id: i32,
    perm: Permission,
) -> Result<()> {
    if current_group_id == target_group_id {
        return Err(Error::Forbidden(format!(
            "{what} already belongs to the target group"
        )));
    }
    ctx.assert_group_perm(current_group_id, perm).map_err(|_| {
        Error::Forbidden(
            "transferring ownership requires edit rights on the current owner group".into(),
        )
    })?;
    if !ctx.can_access_group(target_group_id) {
        return Err(Error::Forbidden(
            "you can only transfer into groups you belong to".into(),
        ));
    }
    ctx.assert_group_perm(target_group_id, perm).map_err(|_| {
        Error::Forbidden("transferring ownership requires edit rights on the target group".into())
    })?;
    Ok(())
}
