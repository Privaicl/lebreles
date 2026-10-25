import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { post } from './helpers'

type Row = Record<string, unknown>
const rows = async () => (await env.DB.prepare('SELECT * FROM avistamientos').all<Row>()).results
const valid = {
  nombre: 'Ana Rojas',
  correo: 'ana@correo.cl',
  comuna: 'Ñuñoa',
  fecha: '2026-10-01',
  descripcion: 'Estaba en el pasillo a las 3:40. No se movía.',
}

beforeEach(async () => {
  await env.DB.exec('DELETE FROM avistamientos')
})

describe('POST /api/avistamiento', () => {
  it('stores a sighting', async () => {
    const res = await post('/api/avistamiento', valid)
    expect(res.status).toBe(201)
    expect(((await res.json()) as Row).mensaje).toBe('Reporte recibido. Ya sabíamos.')
    const all = await rows()
    expect(all.length).toBe(1)
    expect(all[0]).toMatchObject({ comuna: 'Ñuñoa', correo: 'ana@correo.cl', fecha: '2026-10-01' })
  })

  it('rejects a future date', async () => {
    const res = await post('/api/avistamiento', { ...valid, fecha: '2999-01-01' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ campo: 'fecha', mensaje: 'Falta un campo. Lo notamos.' })
  })

  it('rejects over-long description', async () => {
    const res = await post('/api/avistamiento', { ...valid, descripcion: 'x'.repeat(2001) })
    expect(res.status).toBe(400)
    expect(((await res.json()) as Row).mensaje).toBe('Demasiado largo. Escribe menos.')
    expect((await rows()).length).toBe(0)
  })
})
