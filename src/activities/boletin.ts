import type { Context } from 'hono'
import type { Env } from '../env'
import { ValidationError, readEmail } from '../lib/fields'
import { fail, ok } from '../lib/respond'
import { suscribirEnBrevo } from '../partners/brevo'

// Boletín de la nave: correo mensual para quien se suscribe y acepta recibirlo.
// La aceptación queda registrada con su fecha. El correo se sincroniza con Brevo.

const MENSAJE_OK = 'Suscrito. La primera transmisión llega a fin de mes.'

export async function handleBoletin(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.parseBody()
  let correo: string
  try {
    correo = readEmail(body, 'correo')
  } catch (err) {
    if (err instanceof ValidationError) return fail(c, { campo: 'correo', mensaje: 'Necesitamos un correo que funcione.' }, 'boletin')
    throw err
  }
  if (body.acepta !== 'on') {
    return fail(c, { campo: 'acepta', mensaje: 'Sin tu aceptación no te escribimos.' }, 'boletin')
  }

  const now = new Date().toISOString()
  const result = await c.env.DB.prepare(
    `INSERT INTO boletin_suscriptores (correo, acepta_marketing, consentimiento_at, baja_token, created_at)
     VALUES (?, 1, ?, ?, ?) ON CONFLICT(correo) DO NOTHING`,
  )
    .bind(correo, now, crypto.randomUUID(), now)
    .run()

  if (result.meta.changes > 0) {
    c.executionCtx.waitUntil(
      suscribirEnBrevo(correo, c.env).then(async (r) => {
        if (r !== 'enviado') return
        await c.env.DB.prepare('UPDATE boletin_suscriptores SET brevo_sync_at = ? WHERE correo = ?')
          .bind(new Date().toISOString(), correo)
          .run()
      }),
    )
  }
  return ok(c, MENSAJE_OK, 'boletin')
}

// Enlace de baja incluido en cada boletín: borra al suscriptor.
export async function handleBaja(c: Context<{ Bindings: Env }>): Promise<Response> {
  const token = c.req.query('token') ?? ''
  await c.env.DB.prepare('DELETE FROM boletin_suscriptores WHERE baja_token = ?').bind(token).run()
  return ok(c, 'Ya no te escribimos.', 'boletin', 200)
}
