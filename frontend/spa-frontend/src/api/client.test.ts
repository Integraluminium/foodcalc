import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, setUnauthorizedHandler } from './client'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const okFetch = (body: unknown, status = 200) =>
  vi.fn(async () => jsonResponse(status, body))

afterEach(() => {
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
})

describe('api client', () => {
  it('parses JSON responses', async () => {
    vi.stubGlobal('fetch', okFetch({ ok: true }))
    await expect(api.get<{ ok: boolean }>('/test')).resolves.toEqual({ ok: true })
  })

  it('maps backend error payloads to ApiError', async () => {
    vi.stubGlobal('fetch', okFetch({ error: 'invalid budget: x' }, 400))
    const error = await api.get('/test').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'invalid budget: x' })
  })

  it('notifies the unauthorized handler exactly once on 401', async () => {
    let called = 0
    setUnauthorizedHandler(() => {
      called += 1
    })
    vi.stubGlobal('fetch', okFetch({ error: 'authentication required' }, 401))
    await expect(api.get('/test')).rejects.toBeInstanceOf(ApiError)
    expect(called).toBe(1)
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    await expect(api.post('/test', { a: 1 })).resolves.toBeUndefined()
  })

  it('sends JSON bodies with the right content type and base url', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await api.post('/test', { a: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [input, init] = fetchMock.mock.calls[0]
    expect(input).toBe('/api/test')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ a: 1 }))
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})
