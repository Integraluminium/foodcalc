# Foodcalc MCP Server (`server/src/mcp`)

Streamable HTTP Model Context Protocol server built on `rmcp`, mounted at `/mcp` behind `auth::require_mcp_auth`.

## Architecture & Security Model
- **Authentication (`auth.rs`):** Accepts `Authorization: Bearer fc_...` personal API tokens (verified via SHA-256 hash lookup in `user_api_tokens`) with fallback to `axum-login` session cookies.
- **Channel Isolation:** Every MCP request injects `AppCtx` stamped with `Channel::McpAgent`. Domain operations in `server/src/app/` enforce the user's exact RBAC policy (`AuthCtx`) and block human-only actions (such as minting/revoking API tokens or modifying global permissions) via `actor.require_human()`.
- **Audit Logging:** Mutations performed over MCP are recorded in `audit_log` with the authenticated user's identity and channel metadata.

## Capabilities
- **Tools (`tools/`):** Event queries and catering briefs, recipe lookup/creation, and inventory operations. Destructive or high-impact mutations use MRTR / elicitation confirmation (`InputRequiredResult`) bound to the requesting user and payload hash.
- **Resources (`resources.rs`):** Read-only `foodcalc://` URIs for events, recipes, ingredients, and inventories.
- **Prompts (`prompts.rs`):** Reusable workflow templates (e.g. event catering planning and shopping preparation).

## Local Testing with MCP Inspector
1. Build and start the server with MCP enabled (`cargo run -p server`, or disable via `--no-default-features`).
2. Mint a token using an authenticated browser session:
   ```bash
   curl -b cookies.txt -X POST http://localhost:3000/api/settings/tokens \
     -H "Content-Type: application/json" \
     -d '{"name":"MCP Inspector"}'