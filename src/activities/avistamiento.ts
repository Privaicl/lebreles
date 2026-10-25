import type { Context } from 'hono'
import type { Env } from '../env'
import { MSG, ValidationError, readEmail, readText } from '../lib/fields'
import { fail, ok } from '../lib/respond'

// Reporte de avistamiento: alguien vio a un lebrel donde no debía estar y nos cuenta.

function parse(body: Record<string, unknown>) {
  const nombre = readText(body, 'nombre', 120)
  const correo = readEmail(body, 'correo')
  const comuna = readText(body, 'comuna', 80)
  const fecha = readText(body, 'fecha', 10)
  const today = new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || fecha > today) {
    throw new ValidationError('fecha', MSG.falta)
  }
  const descripcion = readText(body, 'descripcion', 2000)
  return { id: crypto.randomUUID(), nombre, correo, comuna, fecha, descripcion, created_at: new Date().toISOString() }
}

export async function handleAvistamiento(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.parseBody()
  if (body.sitio_web) return ok(c, 'Reporte recibido. Ya sabíamos.', 'avistamientos')
  let r: ReturnType<typeof parse>
  try {
    r = parse(body)
  } catch (err) {
    if (err instanceof ValidationError) return fail(c, err, 'avistamientos')
    throw err
  }
  await c.env.DB.prepare(
    'INSERT INTO avistamientos (id, nombre, correo, comuna, fecha, descripcion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(r.id, r.nombre, r.correo, r.comuna, r.fecha, r.descripcion, r.created_at)
    .run()
  return ok(c, 'Reporte recibido. Ya sabíamos.', 'avistamientos')
}
