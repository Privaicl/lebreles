import type { SolicitudRow } from '../activities/solicitud'
import type { Env } from '../env'

// Clínica Veterinaria Órbita Baja SpA hace la visita de evaluación del hogar
// antes de aprobar una solicitud de colonización. Le enviamos solo lo necesario
// para la visita: el correo del postulante no sale de aquí.
const DEFAULT_URL = 'https://api.clinica-orbita-baja.example/v1/evaluaciones-hogar'

export async function compartirConClinica(
  s: SolicitudRow,
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<'enviado' | 'omitido' | 'error'> {
  if (!env.CLINICA_API_KEY) {
    console.log(JSON.stringify({ evento: 'clinica.omitido', solicitud: s.id }))
    return 'omitido'
  }
  const res = await fetchImpl(env.CLINICA_API_URL ?? DEFAULT_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CLINICA_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      referencia: s.id,
      solicitante: { nombre: s.nombre, rut: s.rut, telefono: s.telefono, direccion: s.direccion },
      hora_luz: s.hora_luz,
      escaleras: s.escaleras === 1,
    }),
  }).catch(() => null)
  const resultado = res?.ok ? 'enviado' : 'error'
  console.log(JSON.stringify({ evento: `clinica.${resultado}`, solicitud: s.id, status: res?.status ?? null }))
  return resultado
}
