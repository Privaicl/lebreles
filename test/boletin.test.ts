import { SELF, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { post } from './helpers'

type Row = Record<string, unknown>
const rows = async () => (await env.DB.prepare('SELECT * FROM boletin_suscriptores').all<Row>()).results
const OK = 'Suscrito. La primera transmisión llega a fin de mes.'

beforeEach(async () => {
  await env.DB.exec('DELETE FROM boletin_suscriptores')
})

describe('POST /api/boletin', () => {
  it('subscribes with consent', async () => {
    const res = await post('/api/boletin', { correo: 'a@b.cl', acepta: 'on' })
    expect(res.status).toBe(201)
    expect(((await res.json()) as Row).mensaje).toBe(OK)
    const [row] = await rows()
    expect(row.acepta_marketing).toBe(1)
    expect(new Date(String(row.consentimiento_at)).toISOString()).toBe(row.consentimiento_at)
    expect(String(row.baja_token)).toHaveLength(36)
  })

  it('refuses without consent', async () => {
    const res = await post('/api/boletin', { correo: 'a@b.cl' })
    expect(res.status).toBe(400)
    expect(((await res.json()) as Row).mensaje).toBe('Sin tu aceptación no te escribimos.')
    expect((await rows()).length).toBe(0)
  })

  it('refuses bad email', async () => {
    const res = await post('/api/boletin', { correo: 'nope', acepta: 'on' })
    expect(res.status).toBe(400)
    expect(((await res.json()) as Row).mensaje).toBe('Necesitamos un correo que funcione.')
  })

  it('re-subscribing is idempotent and case-insensitive', async () => {
    const a = await post('/api/boletin', { correo: 'A@B.cl', acepta: 'on' })
    const b = await post('/api/boletin', { correo: 'a@b.cl', acepta: 'on' })
    expect([a.status, b.status]).toEqual([201, 201])
    expect(((await b.json()) as Row).mensaje).toBe(OK)
    expect((await rows()).length).toBe(1)
  })

  it('baja removes the subscriber', async () => {
    await post('/api/boletin', { correo: 'a@b.cl', acepta: 'on' })
    const [row] = await rows()
    const res = await SELF.fetch(`https://lebreles.cl/api/boletin/baja?token=${row.baja_token}`, {
      headers: { accept: 'application/json' },
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as Row).mensaje).toBe('Ya no te escribimos.')
    expect((await rows()).length).toBe(0)
  })
})
