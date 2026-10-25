import type { Context } from 'hono'
import type { Env } from '../env'
import { ValidationError, readEmail } from '../lib/fields'
import { fail, ok } from '../lib/respond'
import { ensureSession } from '../lib/session'
import { eliminarDeBrevo, suscribirEnBrevo } from '../partners/brevo'

// Boletín de la nave: correo mensual para quien se suscribe y acepta recibirlo.
// La aceptación queda registrada con su fecha. El correo se sincroniza con Brevo.

const MENSAJE_OK = 'Suscrito. La primera transmisión llega a fin de mes.'

export async function handleBoletin(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.parseBody()
  if (body.sitio_web) return ok(c, MENSAJE_OK, 'boletin')
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
  const token = crypto.randomUUID()
  const bajaUrl = `${new URL(c.req.url).origin}/api/boletin/baja?token=${token}`
  const result = await c.env.DB.prepare(
    `INSERT INTO boletin_suscriptores (correo, acepta_marketing, consentimiento_at, baja_token, created_at)
     VALUES (?, 1, ?, ?, ?) ON CONFLICT(correo) DO NOTHING`,
  )
    .bind(correo, now, token, now)
    .run()

  if (result.meta.changes > 0) {
    c.executionCtx.waitUntil(
      suscribirEnBrevo(correo, bajaUrl, c.env).then(async (r) => {
        if (r !== 'enviado') return
        await c.env.DB.prepare('UPDATE boletin_suscriptores SET brevo_sync_at = ? WHERE correo = ?')
          .bind(new Date().toISOString(), correo)
          .run()
      }),
    )
  }
  return ok(c, MENSAJE_OK, 'boletin')
}

// Enlace de baja incluido en cada boletín. El GET solo pide confirmación (los antivirus de correo
// abren los enlaces solos); el POST borra al suscriptor aquí y en Brevo.
export async function handleBajaConfirm(c: Context<{ Bindings: Env }>): Promise<Response> {
  const token = (c.req.query('token') ?? '').replace(/[^0-9a-f-]/gi, '')
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Misión Lebrel</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#040408;color:#ebe5d6;font:400 18px/1.6 system-ui,sans-serif}
main{max-width:34em;padding:24px}p{font:400 clamp(28px,5vw,44px)/1.15 "Cormorant Garamond",Georgia,serif;margin:0 0 28px}
button{font:600 15px system-ui;padding:13px 22px;border-radius:999px;border:0;background:#ebe5d6;color:#040408;cursor:pointer}</style></head>
<body><main><p>¿Quieres que dejemos de escribirte?</p>
<form method="post" action="/api/boletin/baja"><input type="hidden" name="token" value="${token}"><button type="submit">Dejar de recibirlo</button></form>
</main></body></html>`
  return ensureSession(c.req.raw, c.html(html))
}

export async function handleBaja(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.parseBody()
  const token = typeof body.token === 'string' ? body.token : ''
  const row = await c.env.DB.prepare('DELETE FROM boletin_suscriptores WHERE baja_token = ? RETURNING correo')
    .bind(token)
    .first<{ correo: string }>()
  if (row) c.executionCtx.waitUntil(eliminarDeBrevo(row.correo, c.env))
  return ok(c, 'Ya no te escribimos.', 'boletin', 200)
}
