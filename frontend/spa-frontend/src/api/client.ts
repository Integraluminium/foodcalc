/**
 * The single boundary between the SPA and the Foodcalc REST API.
 *
 * Every backend call goes through `request` below; resource-specific
 * wrappers live in `./endpoints/*`. If the REST API changes (paths,
 * payload shapes, auth behavior), this file and `./types.ts` are the
 * only places that need updating.
 *
 * Auth uses session cookies (`credentials: 'include'`), issued by the
 * backend via `POST /api/auth/login`.
 */

const BASE_URL = '/api'

/** Error thrown for every non-2xx response. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

/**
 * Registers the callback invoked whenever the backend answers 401.
 * Used by `RequireAuth` to send the user to the login page.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

/** Builds `?a=1&b=2` from a params object, skipping undefined/empty values. */
export function buildQuery(
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

type RequestOptions = Omit<RequestInit, 'body' | 'method' | 'headers'> & {
  body?: unknown
  headers?: Record<string, string>
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `${response.status} ${response.statusText}`
  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object' && 'error' in payload) {
      message = String((payload as { error: unknown }).error)
    }
  } catch {
    // Response had no JSON body — keep the default message.
  }
  return new ApiError(response.status, message)
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options
  const init: RequestInit = {
    method,
    credentials: 'include',
    ...rest,
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    }
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch (cause) {
    throw new ApiError(
      0,
      `Netzwerkfehler: ${BASE_URL} nicht erreichbar (${String(cause)})`,
    )
  }

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.()
    throw await toApiError(response)
  }
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined as T
  return (await response.json()) as T
}

/** Extracts a file name from a Content-Disposition header, if present. */
function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(header)
  const raw = match?.[1] ?? match?.[2]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Downloads a binary resource (e.g. a PDF export) with the session
 * cookie and triggers a browser download.
 */
async function download(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, { credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.()
    throw await toApiError(response)
  }
  const blob = await response.blob()
  const name =
    fileNameFromDisposition(response.headers.get('content-disposition')) ??
    fallbackName
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
  download,
}
