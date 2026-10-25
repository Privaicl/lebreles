export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  /** Orígenes desde los que aceptamos formularios, separados por coma. */
  ALLOWED_ORIGINS: string
  /** Lista de Brevo a la que se suman los suscriptores del boletín. */
  BREVO_LIST_ID: string
  /** Secretos opcionales. Sin ellos, las integraciones con terceros se omiten. */
  BREVO_API_KEY?: string
  CLINICA_API_KEY?: string
  CLINICA_API_URL?: string
}
