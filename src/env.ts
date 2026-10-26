export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  /** Orígenes desde los que aceptamos formularios, separados por coma. */
  ALLOWED_ORIGINS: string
  /** Secretos opcionales. Sin ellos, las integraciones con terceros se omiten. */
  CLINICA_API_KEY?: string
  CLINICA_API_URL?: string
}
