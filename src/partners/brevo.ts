import type { Env } from '../env'

// Brevo envía el Boletín de la nave. Cada suscriptor nuevo se agrega a la lista BREVO_LIST_ID.
// https://developers.brevo.com/reference/createcontact
export async function suscribirEnBrevo(
  correo: string,
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<'enviado' | 'omitido' | 'error'> {
  if (!env.BREVO_API_KEY) {
    console.log(JSON.stringify({ evento: 'brevo.omitido' }))
    return 'omitido'
  }
  const res = await fetchImpl('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email: correo, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true }),
  }).catch(() => null)
  const resultado = res?.ok ? 'enviado' : 'error'
  console.log(JSON.stringify({ evento: `brevo.${resultado}`, status: res?.status ?? null }))
  return resultado
}
