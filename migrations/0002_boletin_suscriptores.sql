-- Suscriptores del Boletín de la nave (correo mensual).
-- Finalidad: enviar el boletín a quien lo pidió y aceptó recibirlo.
-- Conservación: hasta que la persona se da de baja (GET /api/boletin/baja).
-- Destinatario: Brevo (proveedor de envío de correos, Unión Europea), ver src/partners/brevo.ts.
CREATE TABLE boletin_suscriptores (
  correo TEXT PRIMARY KEY,
  acepta_marketing INTEGER NOT NULL CHECK (acepta_marketing = 1),
  consentimiento_at TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'web',
  baja_token TEXT NOT NULL UNIQUE,
  brevo_sync_at TEXT,
  created_at TEXT NOT NULL
);
