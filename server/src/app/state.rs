//! Shared application state for all transports (`api`, `frontend`, `mcp`).

use std::ops::Deref;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use axum::Extension;

pub type FoodLib = Extension<foodlib_new::FoodLib>;

#[derive(Clone)]
pub struct MyAppState {
    pub db: foodlib_new::FoodLib,
    /// Whether MCP mutating tools must confirm via elicitation. Runtime-
    /// toggleable (`GET/PUT /api/settings/mcp-elicitation`, guarded by
    /// `admin:manage_settings`) so clients without elicitation support can
    /// still drive the server. Initial value comes from the env var
    /// `FOODCALC_MCP_REQUIRE_ELICITATION` (default: `true`).
    pub mcp_elicitation_required: Arc<AtomicBool>,
}

impl Deref for MyAppState {
    type Target = foodlib_new::FoodLib;

    fn deref(&self) -> &Self::Target {
        &self.db
    }
}

impl MyAppState {
    pub fn new(db: foodlib_new::FoodLib, mcp_elicitation_required: bool) -> Self {
        Self {
            db,
            mcp_elicitation_required: Arc::new(AtomicBool::new(mcp_elicitation_required)),
        }
    }

    /// Whether MCP mutating tools currently require elicitation confirmation.
    pub fn mcp_elicitation_required(&self) -> bool {
        self.mcp_elicitation_required.load(Ordering::Relaxed)
    }

    /// Toggles the MCP elicitation requirement (audited at the call site).
    pub fn set_mcp_elicitation_required(&self, required: bool) {
        self.mcp_elicitation_required
            .store(required, Ordering::Relaxed);
    }
}
