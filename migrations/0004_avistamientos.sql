-- Reportes de avistamiento: personas que vieron a un lebrel donde no debía estar.
-- Finalidad: catalogar los avistamientos.
-- Conservación: 12 meses (ver src/retention.ts). Destinatarios: ninguno.
CREATE TABLE avistamientos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  comuna TEXT NOT NULL,
  fecha TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX avistamientos_created_at ON avistamientos (created_at);
