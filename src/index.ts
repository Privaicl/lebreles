import { Hono } from 'hono'
import { handleCollect } from './activities/analitica'
import { handleAvistamiento } from './activities/avistamiento'
import { handleBaja, handleBoletin } from './activities/boletin'
import { handleSolicitud } from './activities/solicitud'
import type { Env } from './env'
import { fail } from './lib/respond'
import { ensureSession, hasSession } from './lib/session'
import { purgeExpired } from './retention'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => ensureSession(c.req.raw, await c.env.ASSETS.fetch(c.req.raw)))
app.get('/index.html', async (c) => ensureSession(c.req.raw, await c.env.ASSETS.fetch(c.req.raw)))

// Los formularios solo se aceptan desde nuestra página: mismo origen y con cookie de sesión.
// /api/collect queda fuera porque lo envía navigator.sendBeacon.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'POST' || c.req.path === '/api/collect') return next()
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  const origin = c.req.header('origin') ?? ''
  if (!allowed.includes(origin) || !hasSession(c.req.raw)) {
    return fail(c, { mensaje: 'Esta solicitud no vino de aquí.' }, 'top', 403)
  }
  return next()
})

app.post('/api/solicitud', handleSolicitud)
app.post('/api/boletin', handleBoletin)
app.get('/api/boletin/baja', handleBaja)
app.post('/api/avistamiento', handleAvistamiento)
app.post('/api/collect', handleCollect)

async function scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
  ctx.waitUntil(purgeExpired(env.DB, new Date(event.scheduledTime)))
}

export default { fetch: app.fetch, scheduled }
