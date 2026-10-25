// Lectura y validación de campos de formulario. Los mensajes son los que ve el visitante.

export const MSG = {
  falta: 'Falta un campo. Lo notamos.',
  largo: 'Demasiado largo. Escribe menos.',
  correo: 'Ese correo no llega a ninguna parte.',
  telefono: 'Ese número no contesta.',
  rut: 'Ese RUT no existe. Lo revisamos.',
} as const

export class ValidationError extends Error {
  constructor(
    readonly campo: string,
    message: string,
  ) {
    super(message)
  }
}

type Body = Record<string, unknown>

export function readText(body: Body, campo: string, max: number): string {
  const raw = body[campo]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) throw new ValidationError(campo, MSG.falta)
  if ([...value].length > max) throw new ValidationError(campo, MSG.largo)
  return value
}

export function readEmail(body: Body, campo: string): string {
  const value = readText(body, campo, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError(campo, MSG.correo)
  return value
}

export function readPhone(body: Body, campo: string): string {
  const value = readText(body, campo, 30).replace(/[^\d+]/g, '')
  const digits = value.replace(/\D/g, '').length
  if (digits < 8 || digits > 15) throw new ValidationError(campo, MSG.telefono)
  return value
}
