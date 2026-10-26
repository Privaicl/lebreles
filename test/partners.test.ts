import { describe, expect, it } from 'vitest'
import type { SolicitudRow } from '../src/activities/solicitud'
import type { Env } from '../src/env'
import { compartirConClinica } from '../src/partners/clinica'

type Call = { url: string; init: RequestInit }
function stubFetch(status: number) {
  const calls: Call[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(null, { status })
  }) as unknown as typeof fetch
  return { calls, impl }
}

const baseEnv = { ALLOWED_ORIGINS: '' } as Env

const solicitud: SolicitudRow = {
  id: 'abc',
  nombre: 'José Peña',
  rut: '12345678-5',
  correo: 'jose@correo.cl',
  telefono: '+56911111111',
  direccion: 'Pasaje Sin Salida 0',
  hora_luz: '23:30',
  escaleras: 1,
  created_at: '2026-10-25T00:00:00.000Z',
}

describe('clinica', () => {
  it('clinica is skipped without key', async () => {
    const f = stubFetch(200)
    expect(await compartirConClinica(solicitud, baseEnv, f.impl)).toBe('omitido')
    expect(f.calls.length).toBe(0)
  })

  it('clinica sends only visit data with key', async () => {
    const f = stubFetch(200)
    const env = { ...baseEnv, CLINICA_API_KEY: 'k' }
    expect(await compartirConClinica(solicitud, env, f.impl)).toBe('enviado')
    expect(f.calls.length).toBe(1)
    expect(f.calls[0].url).toBe('https://api.clinica-orbita-baja.example/v1/evaluaciones-hogar')
    expect(new Headers(f.calls[0].init.headers).get('authorization')).toBe('Bearer k')
    const body = JSON.parse(String(f.calls[0].init.body))
    expect(body).toEqual({
      referencia: 'abc',
      solicitante: { nombre: 'José Peña', rut: '12345678-5', telefono: '+56911111111', direccion: 'Pasaje Sin Salida 0' },
      hora_luz: '23:30',
      escaleras: true,
    })
    expect(JSON.stringify(body)).not.toContain('correo')
    expect(await compartirConClinica(solicitud, env, stubFetch(500).impl)).toBe('error')
  })
})
