import { env } from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'
import { post } from './helpers'

const valid = {
  nombre: 'Ana',
  rut: '11.111.111-1',
  correo: 'a@b.cl',
  telefono: '+56911111111',
  direccion: 'Pasaje 0',
  hora_luz: '23:30',
  escaleras: 'no',
}

afterEach(async () => {
  await env.DB.exec('ALTER TABLE solicitudes_rota RENAME TO solicitudes_colonizacion').catch(() => {})
})

describe('server errors', () => {
  it('a database failure gets a branded 500, not plain text', async () => {
    await env.DB.exec('ALTER TABLE solicitudes_colonizacion RENAME TO solicitudes_rota')
    const res = await post('/api/solicitud', valid)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ ok: false, mensaje: 'Se cortó la señal con la nave. Intenta más tarde.' })
  })

  it('the branded 500 is HTML for form posts', async () => {
    await env.DB.exec('ALTER TABLE solicitudes_colonizacion RENAME TO solicitudes_rota')
    const res = await post('/api/solicitud', valid, { accept: 'html' })
    expect(res.status).toBe(500)
    expect(res.headers.get('content-type')).toMatch(/^text\/html/)
    expect(await res.text()).toContain('Se cortó la señal con la nave. Intenta más tarde.')
  })
})
