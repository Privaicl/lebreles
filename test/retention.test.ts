import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { cutoff, purgeExpired } from '../src/retention'

const NOW = new Date('2026-10-25T06:40:00Z')

async function insertSolicitud(id: string, created: string) {
  await env.DB.prepare(
    `INSERT INTO solicitudes_colonizacion (id, nombre, rut, correo, telefono, direccion, hora_luz, escaleras, created_at)
     VALUES (?, 'N', '12345678-5', 'a@b.cl', '+56911111111', 'D', '23:30', 0, ?)`,
  )
    .bind(id, created)
    .run()
}
async function insertVisita(vid: string, created: string) {
  await env.DB.prepare('INSERT INTO visitas (visitor_id, ruta, created_at) VALUES (?, ?, ?)').bind(vid, '/', created).run()
}
const ids = async (sql: string) => (await env.DB.prepare(sql).all<{ k: string }>()).results.map((r) => r.k)

beforeEach(async () => {
  await env.DB.exec('DELETE FROM solicitudes_colonizacion; DELETE FROM visitas; DELETE FROM avistamientos;')
})

describe('retention', () => {
  it('cutoff subtracts calendar months', () => {
    expect(cutoff(NOW, 24)).toBe('2024-10-25T06:40:00.000Z')
  })

  it('purges only expired rows', async () => {
    await insertSolicitud('old', '2024-10-24T00:00:00.000Z')
    await insertSolicitud('new', '2024-10-26T00:00:00.000Z')
    await insertVisita('old', '2025-09-24T00:00:00.000Z')
    await insertVisita('new', '2025-09-26T00:00:00.000Z')
    expect(await purgeExpired(env.DB, NOW)).toEqual({ solicitudes_colonizacion: 1, visitas: 1, avistamientos: 0 })
    expect(await ids('SELECT id AS k FROM solicitudes_colonizacion')).toEqual(['new'])
    expect(await ids('SELECT visitor_id AS k FROM visitas')).toEqual(['new'])
  })

  it('empty tables are fine', async () => {
    expect(await purgeExpired(env.DB, NOW)).toEqual({ solicitudes_colonizacion: 0, visitas: 0, avistamientos: 0 })
  })

  it('purges sightings after 12 months', async () => {
    for (const [id, created] of [['old', '2025-10-24T00:00:00.000Z'], ['new', '2025-10-26T00:00:00.000Z']]) {
      await env.DB.prepare(
        `INSERT INTO avistamientos (id, nombre, correo, comuna, fecha, descripcion, created_at)
         VALUES (?, 'N', 'a@b.cl', 'C', '2025-10-01', 'D', ?)`,
      )
        .bind(id, created)
        .run()
    }
    expect((await purgeExpired(env.DB, NOW)).avistamientos).toBe(1)
    expect(await ids('SELECT id AS k FROM avistamientos')).toEqual(['new'])
  })
})
