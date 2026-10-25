-- Solicitudes de colonización (postulaciones para recibir a un lebrel en casa).
-- Finalidad: evaluar si el hogar del postulante es apto para recibir a un lebrel.
-- Conservación: 24 meses desde la solicitud; luego se eliminan (ver src/retention.ts).
-- Destinatario: Clínica Veterinaria Órbita Baja SpA, para la visita de evaluación del hogar
-- (ver src/partners/clinica.ts).
CREATE TABLE solicitudes_colonizacion (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rut TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  hora_luz TEXT NOT NULL,
  escaleras INTEGER NOT NULL CHECK (escaleras IN (0, 1)),
  compartida_clinica_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX solicitudes_colonizacion_created_at ON solicitudes_colonizacion (created_at);
