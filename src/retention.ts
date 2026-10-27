// Plazos de conservación. El cron diario (wrangler.jsonc, 03:40 en Chile) borra lo vencido.
export const RETENCION: ReadonlyArray<{ tabla: 'solicitudes_colonizacion' | 'visitas' | 'avistamientos'; meses: number }> = [
  { tabla: 'solicitudes_colonizacion', meses: 24 },
  { tabla: 'visitas', meses: 13 },
  { tabla: 'avistamientos', meses: 12 },
]

export function cutoff(now: Date, meses: number): string {
  const d = new Date(now)
  d.setUTCMonth(d.getUTCMonth() - meses)
  return d.toISOString()
}

export async function purgeExpired(db: D1Database, now: Date): Promise<Record<string, number>> {
  const borrados: Record<string, number> = {}
  for (const { tabla, meses } of RETENCION) {
    const res = await db.prepare(`DELETE FROM ${tabla} WHERE created_at < ?`).bind(cutoff(now, meses)).run()
    borrados[tabla] = res.meta.changes
  }
  console.log(JSON.stringify({ evento: 'retencion.purga', ...borrados }))
  return borrados
}
