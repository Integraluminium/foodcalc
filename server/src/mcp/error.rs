//! Bridge between application-layer errors (`foodlib_new::Error`) and MCP
//! tool/protocol error semantics.
//!
//! Recoverable domain errors (`NotFound`, `Validation`, `InvalidInput`,
//! `Conflict`, `Forbidden`) are returned as `Ok(CallToolResult::error(...))`
//! with actionable guidance so the LLM can inspect the failure and self-correct.
//! Infrastructure failures (`Database`, `Misc`, etc.) become `Err(McpError)`.

use rmcp::{
    model::{CallToolResult, ContentBlock},
    ErrorData as McpError,
};
use serde::Serialize;

use crate::app::Error as AppError;

/// Serializes a structured JSON payload into a successful [`CallToolResult`].
pub fn tool_json<T: Serialize>(value: &T) -> Result<CallToolResult, McpError> {
    let text = serde_json::to_string_pretty(value)
        .map_err(|err| McpError::internal_error(format!("serialization error: {err}"), None))?;
    Ok(CallToolResult::success(vec![ContentBlock::text(text)]))
}

/// Converts a domain `Result<T>` into an MCP tool result, routing recoverable
/// errors to `CallToolResult::error` and infrastructure errors to `Err(McpError)`.
pub fn map_tool_result<T: Serialize>(
    result: Result<T, AppError>,
) -> Result<CallToolResult, McpError> {
    match result {
        Ok(value) => tool_json(&value),
        Err(err) => map_app_error_to_tool(err),
    }
}

/// Maps an [`AppError`] for tool execution.
pub fn map_app_error_to_tool(err: AppError) -> Result<CallToolResult, McpError> {
    match err {
        AppError::NotFound { entity, id } => Ok(CallToolResult::error(vec![ContentBlock::text(
            format!(
                "NotFound: {entity} with id '{id}' was not found or is not accessible to your user groups. \
                 Call the corresponding list/search tool to find valid IDs and retry."
            ),
        )])),
        AppError::Validation { message } | AppError::InvalidInput { message } => {
            Ok(CallToolResult::error(vec![ContentBlock::text(format!(
                "ValidationError: {message}. Check field types, numeric strings, and RFC 3339 timestamps, then retry."
            ))]))
        }
        AppError::Conflict { message } => Ok(CallToolResult::error(vec![ContentBlock::text(
            format!(
                "Conflict: {message}. Inspect the current state of the entity before retrying."
            ),
        )])),
        AppError::Forbidden(message) => Ok(CallToolResult::error(vec![ContentBlock::text(
            format!(
                "PermissionDenied: {message}. Your account lacks the required group or event permission for this operation."
            ),
        )])),
        AppError::Unauthorized(message) => Ok(CallToolResult::error(vec![ContentBlock::text(
            format!("Unauthorized: {message}. Ensure the MCP HTTP session is logged in."),
        )])),
        AppError::UserNotFound { name } => Ok(CallToolResult::error(vec![ContentBlock::text(
            format!("NotFound: user '{name}' does not exist."),
        )])),
        AppError::Database(db_err) => {
            log::error!("MCP database failure: {db_err}");
            Err(McpError::internal_error(
                "Internal database error while executing tool",
                None,
            ))
        }
        AppError::Misc(msg) => {
            log::error!("MCP internal error: {msg}");
            Err(McpError::internal_error(msg, None))
        }
        AppError::Hashing
        | AppError::Redirect(_, _)
        | AppError::Authentication(_)
        | AppError::Status(_) => {
            log::error!("MCP unexpected infrastructure error: {err}");
            Err(McpError::internal_error(err.to_string(), None))
        }
    }
}

/// Maps an [`AppError`] for MCP resource reads (`read_resource`).
pub fn map_app_error_to_mcp(err: AppError) -> McpError {
    match err {
        AppError::NotFound { entity, id } => {
            McpError::resource_not_found(format!("{entity} '{id}' not found"), None)
        }
        AppError::Validation { message } | AppError::InvalidInput { message } => {
            McpError::invalid_params(message, None)
        }
        AppError::Forbidden(message) | AppError::Unauthorized(message) => {
            McpError::invalid_request(message, None)
        }
        other => {
            log::error!("MCP resource error: {other}");
            McpError::internal_error(other.to_string(), None)
        }
    }
}
