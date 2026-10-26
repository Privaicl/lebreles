import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { type Tarea, atenderPrivai, borrar, ejecutar, normalizarCorreo, recolectar } from '../src/derechos'
import type { Env } from '../src/env'

const count = async () =>
  (await env.DB.prepare('SELECT count(*) AS n FROM solicitudes_colonizacion').first<{ n: number }>())?.n

async function insertSolicitud(id: string, correo: string, compartida: string | null = null) {
  await env.DB.prepare(
    `INSERT INTO solicitudes_colonizacion
       (id, nombre, rut, correo, telefono, direccion, hora_luz, escaleras, compartida_clinica_at, created_at)
     VALUES (?, 'José Peña', '12345678-5', ?, '+56911111111', 'Pasaje Sin Salida 0', '23:30', 1, ?, '2026-10-25T00:00:00.000Z')`,
  )
    .bind(id, correo, compartida)
    .run()
}

function stubFetch(status: number) {
  const calls: { url: string; method?: string }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), method: init.method })
    return new Response(null, { status })
  }) as unknown as typeof fetch
  return { calls, impl }
}

// Simula la API de agentes de Privai: entrega `tareas` y anota cada llamada con su body.
function stubPrivai(tareas: Partial<Tarea>[], pickUp = 200) {
  const calls: { method: string; path: string; auth: string | null; body: unknown }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname.replace('/api/dsar/agent', '')
    calls.push({
      method: String(init.method),
      path,
      auth: new Headers(init.headers).get('authorization'),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    })
    if (path === '/tasks') return Response.json({ items: tareas })
    if (path.endsWith('/pick-up')) return new Response(null, { status: pickUp })
    return new Response(null, { status: 200 })
  }) as unknown as typeof fetch
  return { calls, impl }
}

const conAgente = { ...env, PRIVAI_API_URL: 'https://api.privai.test', PRIVAI_AGENT_KEY: 'agent_k' } as Env
const conClinica = { ...env, CLINICA_API_KEY: 'c' } as Env
const tarea = (t: Partial<Tarea>): Tarea => ({
  id: 't1',
  action: 'collect',
  node_key: 'lebreles_recopilar',
  requester_email: 'jose@correo.cl',
  ...t,
})

beforeEach(async () => {
  await env.DB.exec('DELETE FROM solicitudes_colonizacion')
})

describe('derechos: acceso', () => {
  it('returns every stored row for the email, as stored', async () => {
    await insertSolicitud('s1', 'jose@correo.cl', '2026-10-25T00:01:00.000Z')
    await insertSolicitud('otro', 'otra@correo.cl')

    expect(await recolectar(env.DB, 'jose@correo.cl')).toEqual({
      correo: 'jose@correo.cl',
      solicitudes_colonizacion: [
        {
          id: 's1',
          nombre: 'José Peña',
          rut: '12345678-5',
          correo: 'jose@correo.cl',
          telefono: '+56911111111',
          direccion: 'Pasaje Sin Salida 0',
          hora_luz: '23:30',
          escaleras: 1,
          compartida_clinica_at: '2026-10-25T00:01:00.000Z',
          created_at: '2026-10-25T00:00:00.000Z',
        },
      ],
    })
  })

  it('a collect task hands Privai one record per row, tagged with its table', async () => {
    await insertSolicitud('s1', 'jose@correo.cl')
    const entrega = await ejecutar(tarea({ requester_email: ' JOSE@correo.cl' }), env as Env)
    expect(entrega.ruta).toBe('complete')
    const { records } = (entrega.body as { result: { records: Record<string, unknown>[] } }).result
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ tabla: 'solicitudes_colonizacion', id: 's1', rut: '12345678-5' })
  })

  it('normalizes the email the way the forms store it', () => {
    expect(normalizarCorreo('  A@B.cl ')).toBe('a@b.cl')
    expect(normalizarCorreo('nope')).toBeNull()
  })
})

describe('derechos: supresión', () => {
  it('deletes every row for the email and leaves other people alone', async () => {
    await insertSolicitud('s1', 'jose@correo.cl')
    await insertSolicitud('s2', 'jose@correo.cl')
    await insertSolicitud('otro', 'otra@correo.cl')

    const entrega = await ejecutar(tarea({ action: 'delete', node_key: 'lebreles_eliminar' }), env as Env)
    expect(entrega).toEqual({
      ruta: 'complete',
      body: { result: { records: [] }, evidence: { borrados: { solicitudes_colonizacion: 2 }, terceros: { clinica: [] } } },
    })
    expect(await count()).toBe(1)
  })

  it('is safe to repeat', async () => {
    await insertSolicitud('s1', 'jose@correo.cl')
    await borrar(env.DB, env as Env, 'jose@correo.cl')
    expect((await borrar(env.DB, env as Env, 'jose@correo.cl')).borrados).toEqual({ solicitudes_colonizacion: 0 })
  })

  it('tells the clinic only about the solicitudes it received', async () => {
    await insertSolicitud('s1', 'jose@correo.cl', '2026-10-25T00:01:00.000Z')
    await insertSolicitud('s2', 'jose@correo.cl')
    const f = stubFetch(204)

    const res = await borrar(env.DB, conClinica, 'jose@correo.cl', f.impl)
    expect(res).toEqual({ ok: true, borrados: { solicitudes_colonizacion: 2 }, terceros: { clinica: ['enviado'] } })
    expect(f.calls).toEqual([
      { url: 'https://api.clinica-orbita-baja.example/v1/evaluaciones-hogar/s1', method: 'DELETE' },
    ])
  })

  it('an evaluation already gone from the clinic counts as deleted', async () => {
    await insertSolicitud('s1', 'jose@correo.cl', '2026-10-25T00:01:00.000Z')
    expect((await borrar(env.DB, conClinica, 'jose@correo.cl', stubFetch(404).impl)).ok).toBe(true)
    expect(await count()).toBe(0)
  })

  it('keeps everything and fails the task when the clinic fails, so it goes to review', async () => {
    await insertSolicitud('s1', 'jose@correo.cl', '2026-10-25T00:01:00.000Z')
    const entrega = await ejecutar(
      tarea({ action: 'delete', node_key: 'lebreles_eliminar' }),
      conClinica,
      stubFetch(500).impl,
    )
    expect(entrega.ruta).toBe('fail')
    expect(await count()).toBe(1)
  })
})

describe('agente de Privai', () => {
  it('does nothing without the agent key', async () => {
    const p = stubPrivai([tarea({})])
    await atenderPrivai({ ...conAgente, PRIVAI_AGENT_KEY: undefined }, p.impl)
    expect(p.calls).toEqual([])
  })

  it('heartbeats, polls, takes its own task and completes it', async () => {
    await insertSolicitud('s1', 'jose@correo.cl')
    const p = stubPrivai([tarea({ id: 'mia' }), tarea({ id: 'ajena', node_key: 'crm_recopilar' })])

    await atenderPrivai(conAgente, p.impl)
    expect(p.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /heartbeat',
      'GET /tasks',
      'POST /tasks/mia/pick-up',
      'POST /tasks/mia/complete',
    ])
    expect(p.calls.every((c) => c.auth === 'Bearer agent_k')).toBe(true)
    const complete = p.calls[3].body as { result: { records: { id: string }[] } }
    expect(complete.result.records.map((r) => r.id)).toEqual(['s1'])
  })

  it('skips a task another run already took', async () => {
    const p = stubPrivai([tarea({ id: 'mia' })], 409)
    await atenderPrivai(conAgente, p.impl)
    expect(p.calls.map((c) => c.path)).toEqual(['/heartbeat', '/tasks', '/tasks/mia/pick-up'])
  })

  it('fails tasks it cannot do instead of letting them expire', async () => {
    const p = stubPrivai([
      tarea({ id: 'rect', action: 'rectify' }),
      tarea({ id: 'sin-correo', requester_email: 'nope' }),
    ])
    await atenderPrivai(conAgente, p.impl)
    const fails = p.calls.filter((c) => c.path.endsWith('/fail'))
    expect(fails.map((c) => c.path)).toEqual(['/tasks/rect/fail', '/tasks/sin-correo/fail'])
    expect((fails[0].body as { error: string }).error).toMatch(/rectify/)
  })

  it('stops quietly when Privai is down', async () => {
    const down = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch
    await expect(atenderPrivai(conAgente, down)).resolves.toBeUndefined()
  })
})
