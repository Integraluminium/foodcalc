//! Personal API token lifecycle & verification (`Authorization: Bearer fc_...`).

use foodlib_new::{auth_context::AuthCtx, FoodLib};
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::FromRow;
use time::{Duration, OffsetDateTime};

use crate::app::{audit, AppCtx, Error, MyAppState, Result};

const TOKEN_PREFIX_TAG: &str = "fc_";

#[derive(Debug, Deserialize)]
pub struct CreateTokenInput {
    /// Human-readable label (e.g. `"MCP Inspector"` or `"Claude Desktop"`).
    pub name: String,
    /// Optional lifetime in days (omit for a non-expiring token).
    pub expires_in_days: Option<i64>,
}

/// Metadata returned when listing a user's tokens (never includes `token_hash`).
#[derive(Debug, Serialize, FromRow)]
pub struct ApiTokenInfo {
    pub id: i64,
    pub name: String,
    pub token_prefix: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_used_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub expires_at: Option<OffsetDateTime>,
}

/// Returned **once** upon token creation; `token` is the raw Bearer secret.
#[derive(Debug, Serialize)]
pub struct CreatedApiToken {
    #[serde(flatten)]
    pub info: ApiTokenInfo,
    pub token: String,
}

fn hash_token(raw_token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_token.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_raw_token() -> String {
    let random_part: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(40)
        .map(char::from)
        .collect();
    format!("{TOKEN_PREFIX_TAG}{random_part}")
}

/// Lists all API tokens owned by the authenticated human user.
pub async fn list_my_tokens(state: &MyAppState, actor: &AppCtx) -> Result<Vec<ApiTokenInfo>> {
    actor.require_human()?;
    let pool = state.db.pool_arc();

    let tokens = sqlx::query_as::<_, ApiTokenInfo>(
        r#"
        SELECT id, name, token_prefix, created_at, last_used_at, expires_at
        FROM user_api_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
        "#,
    )
        .bind(actor.ctx.user.id)
        .fetch_all(&*pool)
        .await?;

    Ok(tokens)
}

/// Mints a new personal API token for the authenticated human user.
pub async fn create_my_token(
    state: &MyAppState,
    actor: &AppCtx,
    input: CreateTokenInput,
) -> Result<CreatedApiToken> {
    actor.require_human()?;

    let name = input.name.trim();
    if name.is_empty() {
        return Err(Error::Validation {
            message: "token name must not be empty".into(),
        });
    }
    if name.len() > 100 {
        return Err(Error::Validation {
            message: "token name must be at most 100 characters".into(),
        });
    }

    let expires_at = match input.expires_in_days {
        Some(days) if days <= 0 => {
            return Err(Error::Validation {
                message: "expires_in_days must be greater than 0".into(),
            });
        }
        Some(days) => Some(OffsetDateTime::now_utc() + Duration::days(days)),
        None => None,
    };

    let raw_token = generate_raw_token();
    let token_prefix: String = raw_token.chars().take(10).collect();
    let token_hash = hash_token(&raw_token);
    let pool = state.db.pool_arc();

    let info = sqlx::query_as::<_, ApiTokenInfo>(
        r#"
        INSERT INTO user_api_tokens (user_id, name, token_prefix, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, token_prefix, created_at, last_used_at, expires_at
        "#,
    )
        .bind(actor.ctx.user.id)
        .bind(name)
        .bind(&token_prefix)
        .bind(&token_hash)
        .bind(expires_at)
        .fetch_one(&*pool)
        .await?;

    audit::record(
        state,
        actor,
        "token.create",
        Some("api_token"),
        Some(info.id as i32),
        None,
        None,
        Option::from(json!({ "name": info.name, "prefix": info.token_prefix })),
    )
        .await;

    Ok(CreatedApiToken {
        info,
        token: raw_token,
    })
}

/// Revokes (deletes) one of the authenticated human user's API tokens.
pub async fn revoke_my_token(state: &MyAppState, actor: &AppCtx, token_id: i64) -> Result<()> {
    actor.require_human()?;
    let pool = state.db.pool_arc();

    let res = sqlx::query(
        r#"
        DELETE FROM user_api_tokens
        WHERE id = $1 AND user_id = $2
        "#,
    )
        .bind(token_id)
        .bind(actor.ctx.user.id)
        .execute(&*pool)
        .await?;

    if res.rows_affected() == 0 {
        return Err(Error::NotFound {
            entity: "ApiToken",
            id: token_id.to_string(),
        });
    }

    audit::record(
        state,
        actor,
        "token.revoke",
        Some("api_token"),
        Some(token_id as i32),
        None,
        None,
        Option::from(json!({})),
    )
        .await;

    Ok(())
}

/// Validates a raw Bearer token, checks expiration, updates `last_used_at`,
/// and resolves the owning user's full [`AuthCtx`].
pub async fn authenticate_bearer_token(foodlib: &FoodLib, raw_token: &str) -> Result<AuthCtx> {
    let trimmed = raw_token.trim();
    if trimmed.is_empty() {
        return Err(Error::Unauthorized("empty bearer token".into()));
    }

    let token_hash = hash_token(trimmed);
    let pool = foodlib.pool_arc();

    let row: Option<(i64, i64, Option<OffsetDateTime>)> = sqlx::query_as(
        r#"
        SELECT id, user_id, expires_at
        FROM user_api_tokens
        WHERE token_hash = $1
        "#,
    )
        .bind(&token_hash)
        .fetch_optional(&*pool)
        .await?;

    let (token_id, user_id, expires_at) =
        row.ok_or_else(|| Error::Unauthorized("invalid API token".into()))?;

    if let Some(exp) = expires_at {
        if exp <= OffsetDateTime::now_utc() {
            return Err(Error::Unauthorized("API token has expired".into()));
        }
    }

    let user = match foodlib.users().get_user(user_id).await {
        Ok(user) => user,
        Err(foodlib_new::Error::NotFound { .. }) | Err(foodlib_new::Error::UserNotFound { .. }) => {
            return Err(Error::Unauthorized("token owner no longer exists".into()));
        }
        Err(err) => return Err(err),
    };

    // Best-effort update of last_used_at.
    let _ = sqlx::query(r#"UPDATE user_api_tokens SET last_used_at = now() WHERE id = $1"#)
        .bind(token_id)
        .execute(&*pool)
        .await;

    AuthCtx::from_user(foodlib, user).await
}