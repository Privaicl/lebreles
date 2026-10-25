import { Hono } from 'hono'
import { handleSolicitud } from './activities/solicitud'
import type { Env } from './env'
import { fail } from './lib/respond'
import { ensureSession, hasSession } from './lib/session'

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
app.post('/api/collect', (c) => c.body(null, 501))

async function scheduled(_event: ScheduledController, _env: Env, _ctx: ExecutionContext) {}

export default { fetch: app.fetch, scheduled }
