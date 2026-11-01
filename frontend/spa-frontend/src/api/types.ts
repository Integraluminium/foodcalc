/**
 * DTO types mirroring the backend's JSON serialization.
 *
 * Conventions (must match `server/src/api`):
 * - IDs are `i32`/`i64` → `number`
 * - `BigDecimal` is serialized as a decimal string → `Decimal`
 * - `time::OffsetDateTime` is serialized as RFC3339 → `IsoDateTime`
 * - Optional values arrive as `null` in JSON → `T | null`
 */

/** Backend `BigDecimal`, always transported as a string ("14.86"). */
export type Decimal = string

/** Backend `time::OffsetDateTime`, transported as RFC3339 ("2026-10-24T18:02:00Z"). */
export type IsoDateTime = string

export interface Group {
  id: number
  name: string
  is_personal: boolean
}

export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
}

/** `GET /api/auth/me` — the session user plus the groups they belong to. */
export interface CurrentUser extends User {
  groups: Group[]
}

/** `POST /api/auth/login` payload. */
export interface LoginInput {
  username: string
  password: string
}
