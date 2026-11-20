//! Compile-time feature-gated Model Context Protocol (MCP) server mounted at `/mcp`.
//!
//! Uses Streamable HTTP transport (`rmcp`) behind the session authentication
//! middleware (`auth::require_mcp_auth`) and delegates all domain logic to
//! `crate::app::*` with `Channel::McpAgent`.

pub mod auth;
pub mod error;
pub mod prompts;
pub mod resources;
pub mod tools;

use std::{
    collections::hash_map::RandomState,
    hash::{BuildHasher, Hasher},
    sync::Arc,
};

use axum::{middleware, Router};
use rmcp::{
    handler::server::router::{prompt::PromptRouter, tool::ToolRouter},
    model::{
        Implementation, ListResourcesResult, PaginatedRequestParams, ProtocolVersion,
        ReadResourceRequestParams, ReadResourceResponse, RequestStateCodec, ServerCapabilities,
        ServerConfig,
    },
    prompt_handler,
    schemars::JsonSchema,
    service::RequestContext,
    tool_handler,
    transport::streamable_http_server::{
        session::local::LocalSessionManager, tower::StreamableHttpServerConfig,
        StreamableHttpService,
    },
    ErrorData as McpError, RoleServer, ServerHandler,
};
use serde::{Deserialize, Serialize};

use crate::app::MyAppState;

/// Elicitation payload presented to the human user before executing any
/// mutating MCP tool.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ConfirmMutation {
    /// Set to `true` to confirm and execute the proposed change, or `false` to abort.
    #[schemars(description = "Confirm whether to apply the proposed database change.")]
    pub confirmed: bool,
}

rmcp::elicit_safe!(ConfirmMutation);

/// Stateful MCP handler backed by `MyAppState`.
#[derive(Clone)]
pub struct FoodcalcMcpServer {
    pub state: MyAppState,
    pub state_codec: Arc<RequestStateCodec>,
    tool_router: ToolRouter<Self>,
    prompt_router: PromptRouter<Self>,
}

impl FoodcalcMcpServer {
    pub fn new(state: MyAppState, state_codec: Arc<RequestStateCodec>) -> Self {
        Self {
            state,
            state_codec,
            tool_router: Self::tool_router(),
            prompt_router: Self::prompt_router(),
        }
    }

    pub fn tool_router() -> ToolRouter<Self> {
        tools::combined_tool_router()
    }
}

#[tool_handler]
#[prompt_handler]
impl ServerHandler for FoodcalcMcpServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .enable_prompts()
                .build(),
        )
            .with_protocol_version(ProtocolVersion::LATEST)
            .with_server_info(Implementation::from_build_env())
            .with_instructions(
                "Foodcalc event-catering & recipe-scaling MCP server. Use tools to inspect \
             events, recipes, ingredients, and inventories. Mutating operations require \
             explicit user confirmation via MCP elicitation.",
            )
    }

    async fn list_resources(
        &self,
        _request: Option<PaginatedRequestParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<ListResourcesResult, McpError> {
        let _actor = auth::extract_actor(&context)?;
        Ok(resources::list_resources())
    }

    async fn read_resource(
        &self,
        request: ReadResourceRequestParams,
        context: RequestContext<RoleServer>,
    ) -> Result<ReadResourceResponse, McpError> {
        let actor = auth::extract_actor(&context)?;
        let result = resources::read_resource(&self.state, &actor, &request.uri).await?;
        Ok(result.into())
    }
}

/// Derives a 32-byte HMAC signing key from `MCP_REQUEST_STATE_SECRET` (if set)
/// or generates an ephemeral 32-byte key at startup.
fn build_request_state_codec() -> Arc<RequestStateCodec> {
    let mut key = [0u8; 32];
    if let Ok(secret) = std::env::var("MCP_REQUEST_STATE_SECRET") {
        let bytes = secret.as_bytes();
        for (i, slot) in key.iter_mut().enumerate() {
            *slot = bytes[i % bytes.len()];
        }
    } else {
        for chunk in key.chunks_exact_mut(8) {
            let rand_u64 = RandomState::new().build_hasher().finish();
            chunk.copy_from_slice(&rand_u64.to_le_bytes());
        }
    }
    Arc::new(RequestStateCodec::new(&key))
}

/// Builds the Axum router to be nested at `/mcp`.
pub fn mcp_router(state: MyAppState) -> Router<MyAppState> {
    let state_codec = build_request_state_codec();
    let service = StreamableHttpService::new(
        move || Ok(FoodcalcMcpServer::new(state.clone(), state_codec.clone())),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    );

    Router::new()
        .fallback_service(service)
        .layer(middleware::from_fn(auth::require_mcp_auth))
}