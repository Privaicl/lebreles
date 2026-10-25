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
  await env.DB.exec('DELETE FROM solicitudes_colonizacion; DELETE FROM visitas; DELETE FROM boletin_suscriptores;')
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
    expect(await purgeExpired(env.DB, NOW)).toEqual({ solicitudes_colonizacion: 1, visitas: 1 })
    expect(await ids('SELECT id AS k FROM solicitudes_colonizacion')).toEqual(['new'])
    expect(await ids('SELECT visitor_id AS k FROM visitas')).toEqual(['new'])
  })

  it('never touches the newsletter', async () => {
    await env.DB.prepare(
      `INSERT INTO boletin_suscriptores (correo, acepta_marketing, consentimiento_at, baja_token, created_at)
       VALUES ('a@b.cl', 1, '2019-01-01T00:00:00.000Z', 't', '2019-01-01T00:00:00.000Z')`,
    ).run()
    await purgeExpired(env.DB, NOW)
    expect(await ids('SELECT correo AS k FROM boletin_suscriptores')).toEqual(['a@b.cl'])
  })

  it('empty tables are fine', async () => {
    expect(await purgeExpired(env.DB, NOW)).toEqual({ solicitudes_colonizacion: 0, visitas: 0 })
  })
})
