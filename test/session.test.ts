import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { ensureSession } from '../src/lib/session'
import { post } from './helpers'

describe('lb_session', () => {
  it('ensureSession sets lb_session when absent', () => {
    const res = ensureSession(new Request('https://lebreles.cl/'), new Response('ok'))
    expect(res.headers.get('set-cookie')).toMatch(
      /^lb_session=[0-9a-f-]{36}; Path=\/; HttpOnly; Secure; SameSite=Lax$/,
    )
  })

  it('ensureSession leaves an existing session alone', () => {
    const req = new Request('https://lebreles.cl/', { headers: { cookie: 'lb_session=abc' } })
    const res = ensureSession(req, new Response('ok'))
    expect(res.headers.get('set-cookie')).toBeNull()
  })
})

describe('form origin check', () => {
  it('POST /api/solicitud without lb_session is 403', async () => {
    const res = await post('/api/solicitud', {}, { cookie: null })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe('Esta solicitud no vino de aquí.')
  })

  it('POST /api/solicitud from another origin is 403', async () => {
    const res = await post('/api/solicitud', {}, { origin: 'https://evil.example' })
    expect(res.status).toBe(403)
  })

  it('POST /api/collect needs neither', async () => {
    const res = await SELF.fetch('https://lebreles.cl/api/collect', { method: 'POST', body: '{}' })
    expect(res.status).not.toBe(403)
  })
})
