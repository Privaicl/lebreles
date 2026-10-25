import type { Context } from 'hono'
import type { Env } from '../env'
import { MSG, ValidationError, readEmail, readPhone, readText } from '../lib/fields'
import { fail, ok } from '../lib/respond'
import { isValidRut, normalizeRut } from '../lib/rut'
import { compartirConClinica } from '../partners/clinica'

// Solicitud de colonización: un humano postula para recibir a un lebrel en su casa.
// Se guarda para evaluar el hogar y se comparte con la clínica veterinaria que hace la visita.

export type SolicitudRow = {
  id: string
  nombre: string
  rut: string
  correo: string
  telefono: string
  direccion: string
  hora_luz: string
  escaleras: 0 | 1
  created_at: string
}

const MENSAJE_OK = 'Solicitud recibida. No te vamos a responder.'

function parse(body: Record<string, unknown>): SolicitudRow {
  const nombre = readText(body, 'nombre', 120)
  const rutRaw = readText(body, 'rut', 20)
  if (!isValidRut(rutRaw)) throw new ValidationError('rut', MSG.rut)
  const correo = readEmail(body, 'correo')
  const telefono = readPhone(body, 'telefono')
  const direccion = readText(body, 'direccion', 200)
  const hora_luz = readText(body, 'hora_luz', 5)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora_luz)) throw new ValidationError('hora_luz', MSG.falta)
  const escaleras = readText(body, 'escaleras', 2)
  if (escaleras !== 'si' && escaleras !== 'no') throw new ValidationError('escaleras', MSG.falta)
  return {
    id: crypto.randomUUID(),
    nombre,
    rut: normalizeRut(rutRaw) as string,
    correo,
    telefono,
    direccion,
    hora_luz,
    escaleras: escaleras === 'si' ? 1 : 0,
    created_at: new Date().toISOString(),
  }
}

export async function markShared(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE solicitudes_colonizacion SET compartida_clinica_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run()
}

export async function handleSolicitud(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.parseBody()
  if (body.sitio_web) return ok(c, MENSAJE_OK, 'solicitud')

  let row: SolicitudRow
  try {
    row = parse(body)
  } catch (err) {
    if (err instanceof ValidationError) return fail(c, err, 'solicitud')
    throw err
  }

  await c.env.DB.prepare(
    `INSERT INTO solicitudes_colonizacion
       (id, nombre, rut, correo, telefono, direccion, hora_luz, escaleras, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(row.id, row.nombre, row.rut, row.correo, row.telefono, row.direccion, row.hora_luz, row.escaleras, row.created_at)
    .run()

  c.executionCtx.waitUntil(
    compartirConClinica(row, c.env).then((r) => (r === 'enviado' ? markShared(c.env.DB, row.id) : undefined)),
  )
  return ok(c, MENSAJE_OK, 'solicitud')
}
