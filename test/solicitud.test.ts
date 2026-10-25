import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { post } from './helpers'

const valid = {
  nombre: 'José Peña',
  rut: '12.345.678-5',
  correo: 'Jose@Correo.cl',
  telefono: '+56 9 1111 1111',
  direccion: 'Pasaje Sin Salida 0, Ñuñoa',
  hora_luz: '23:30',
  escaleras: 'si',
}

type Row = Record<string, unknown>
const rows = async () =>
  (await env.DB.prepare('SELECT * FROM solicitudes_colonizacion').all<Row>()).results

beforeEach(async () => {
  await env.DB.exec('DELETE FROM solicitudes_colonizacion')
})

describe('POST /api/solicitud', () => {
  it('stores a valid application', async () => {
    const res = await post('/api/solicitud', valid)
    expect(res.status).toBe(201)
    expect(((await res.json()) as Row).mensaje).toBe('Solicitud recibida. No te vamos a responder.')
    const [row] = await rows()
    expect(row).toMatchObject({ rut: '12345678-5', correo: 'jose@correo.cl', escaleras: 1, hora_luz: '23:30' })
    expect((await rows()).length).toBe(1)
  })

  it('keeps ñ and accents', async () => {
    await post('/api/solicitud', valid)
    const [row] = await rows()
    expect(row.nombre).toBe('José Peña')
    expect(String(row.direccion).endsWith('Ñuñoa')).toBe(true)
  })

  it('rejects missing field', async () => {
    const { direccion: _d, ...rest } = valid
    const res = await post('/api/solicitud', rest)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ campo: 'direccion', mensaje: 'Falta un campo. Lo notamos.' })
  })

  it('rejects bad RUT', async () => {
    const res = await post('/api/solicitud', { ...valid, rut: '11.111.111-2' })
    expect(res.status).toBe(400)
    expect(((await res.json()) as Row).mensaje).toBe('Ese RUT no existe. Lo revisamos.')
  })

  it('rejects over-long field', async () => {
    const res = await post('/api/solicitud', { ...valid, nombre: 'ñ'.repeat(5000) })
    expect(res.status).toBe(400)
    expect(((await res.json()) as Row).mensaje).toBe('Demasiado largo. Escribe menos.')
    expect((await rows()).length).toBe(0)
  })

  it('rejects an unknown escaleras value', async () => {
    const res = await post('/api/solicitud', { ...valid, escaleras: 'quizas' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ campo: 'escaleras' })
  })

  it('honeypot pretends success', async () => {
    const res = await post('/api/solicitud', { ...valid, sitio_web: 'x' })
    expect(res.status).toBe(201)
    expect((await rows()).length).toBe(0)
  })

  it('form post without JSON accept gets HTML', async () => {
    const res = await post('/api/solicitud', valid, { accept: 'html' })
    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toMatch(/^text\/html/)
    const html = await res.text()
    expect(html).toContain('Solicitud recibida. No te vamos a responder.')
    expect(html).toContain('href="/#solicitud"')
  })
})
