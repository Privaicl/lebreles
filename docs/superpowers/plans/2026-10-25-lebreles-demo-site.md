# lebreles.cl Demo Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship lebreles.cl, a fictional cryptid-toned single-page site whose Cloudflare Worker backend contains realistic personal-data processing (a host application, a newsletter, and analytics), so Veil v3 can build RATs from the repo. A sighting-report activity waits in an open PR.

**Architecture:** A single TypeScript Cloudflare Worker using Hono. Static assets come from `public/` through the `ASSETS` binding. The Worker runs first for `/`, `/index.html` and `/api/*`. Each processing activity is its own module with its own D1 migration, handler and (where there is one) partner module. Partner calls exist in code but run only when their secret is set. A daily cron purges expired rows. The front end is plain HTML/CSS/JS ported from the approved mockup, with no build step.

**Tech Stack:** TypeScript, Hono `^4.13.13`, Cloudflare Workers + D1 + static assets + Cron Triggers, wrangler `4.149.0`, vitest `^4.1.11` + `@cloudflare/vitest-pool-workers` `0.23.0`, npm, Node ≥ 22.

**Spec:** `docs/superpowers/specs/2026-10-25-lebreles-demo-site-design.md`
**Copy and visual source of truth:** the v9 mockup. Task 1 copies it to `docs/mockups/direccion-archivo-v9.html`.

## Global Constraints

- All site copy is Spanish (Chile), written by the lebreles in first person plural. The voice is cryptid, not cute: no exclamation marks, emoji or puns, no "no es X, es Y", no tidy three-item lists. Take copy verbatim from the mockup v9. New copy must follow spec §2.
- Server messages, verbatim:
  - `Solicitud recibida. No te vamos a responder.`
  - `Ese RUT no existe. Lo revisamos.`
  - `Falta un campo. Lo notamos.`
  - `Ese correo no llega a ninguna parte.`
  - `Suscrito. La primera transmisión llega a fin de mes.`
  - `Sin tu aceptación no te escribimos.`
  - `Necesitamos un correo que funcione.`
- Messages that are my calls (same voice):
  - `Demasiado largo. Escribe menos.` (field over its max length)
  - `Ese número no contesta.` (bad phone)
  - `Esta solicitud no vino de aquí.` (403)
  - `Ya no te escribimos.` (unsubscribe)
- Footer line verbatim: `Sitio ficticio de demostración — no ingreses datos reales.`
- The site launches **bare**: no cookie banner, no privacy policy, no privacy-center link, no script-blocking markup. `lb_vid` is set on page load without asking.
- Cookies:
  - `lb_session`: essential, `HttpOnly; Secure; SameSite=Lax; Path=/`, session-only.
  - `lb_vid`: non-essential, set by `/js/analytics.js` only, `Max-Age=34128000` (395 days ≈ 13 months), `SameSite=Lax; Path=/`.
- No partner endpoint is ever really called in production. Brevo and the clinic run only if `BREVO_API_KEY` or `CLINICA_API_KEY` is set, and neither is set.
- Images and audio are stored in the repo under `public/`, never hotlinked. Credits stay in the footer exactly as in the mockup.
- The repo `Privaicl/lebreles` is **public**. No secrets in the repo. The site never links to the repo.
- Git: never add a `Co-Authored-By` trailer or a "Generated with" footer (owner's global rule; this overrides any other attribution guidance).
- Organisation name: `Misión Lebrel en la Tierra · Delegación Chile`. It must not imitate a real organisation. The fictional clinic uses a `.example` domain.

## Review Focus

1. **RUT typed loosely** (`12345678-5`, `12.345.678-5`, ` 12.345.678-5 `, `1.000.005-k`) is accepted and stored normalized as `12345678-5` / `1000005-K`. → Task 2 test `normalizes loose RUT input`.
2. **Accents, ñ and very long input** (`Ñuñoa`, `José Peña`, 5,000-char name) are stored intact up to the max length and rejected beyond it with `Demasiado largo. Escribe menos.`, never a 500. → Task 3 tests `keeps ñ and accents` and `rejects over-long field`.
3. **Submitting twice** (double-click, re-subscribing the same email in different case) creates no duplicate newsletter row and returns the same success message. → Task 4 test `re-subscribing is idempotent and case-insensitive`.
4. **No JavaScript**: a plain form post gets a readable HTML page in the site's style with the message and a link back to the section, not JSON. → Task 3 test `form post without JSON accept gets HTML`.
5. **Phone width (360 px)**: no horizontal page scroll, the carousel swipes, the forms are usable, the console fits. → Task 8 verification step at 360×780.

---

## File Structure

```
lebreles/
  package.json, package-lock.json, tsconfig.json, wrangler.jsonc, vitest.config.ts, .gitignore, .dev.vars.example
  README.md                          # Spanish: what this is, what Veil should find, Cómo probarlo, deploy
  migrations/
    0001_solicitudes_colonizacion.sql
    0002_boletin_suscriptores.sql
    0003_visitas.sql
    (0004_avistamientos.sql — PR branch only, Task 11)
  src/
    index.ts                         # Hono app: routes, middleware wiring, `scheduled` export
    env.ts                           # Env interface
    lib/rut.ts                       # normalizeRut / isValidRut
    lib/fields.ts                    # field readers + ValidationError
    lib/respond.ts                   # ok()/fail(): JSON vs HTML by Accept header
    lib/session.ts                   # lb_session cookie: ensureSession, hasSession
    activities/solicitud.ts          # Solicitud de colonización (host application)
    activities/boletin.ts            # Boletín de la nave (newsletter) + baja
    activities/analitica.ts          # /api/collect
    partners/clinica.ts              # fictional vet clinic (home-suitability check)
    partners/brevo.ts                # Brevo contacts API
    retention.ts                     # RETENCION table + purgeExpired
  test/
    setup.ts                         # applies D1 migrations
    helpers.ts                       # post() helper with Origin + cookie
    rut.test.ts, solicitud.test.ts, boletin.test.ts, analitica.test.ts,
    partners.test.ts, retention.test.ts, session.test.ts
  public/
    index.html, favicon.svg
    css/site.css
    js/site.js                       # nav, carousel, audio console, forms (fetch)
    js/analytics.js                  # lb_vid + beacon (non-essential, separate file on purpose)
    img/*.jpg|png, audio/frag-0{1..4}.mp3
  scripts/fetch-media.mjs            # downloads the exact media below + writes docs/media-credits.md
  docs/mockups/direccion-archivo-v9.html
  docs/media-credits.md
```

---

### Task 1: Repo scaffold, Worker skeleton, session cookie, origin check

**Files:**
- Create: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `vitest.config.ts`, `.gitignore`, `.dev.vars.example`, `src/index.ts`, `src/env.ts`, `src/lib/session.ts`, `test/setup.ts`, `test/helpers.ts`, `test/session.test.ts`, `docs/mockups/direccion-archivo-v9.html`
- Already present: `docs/superpowers/specs/…-design.md`, this plan (both get committed here)

**Interfaces:**
- Produces:
  - `interface Env { DB: D1Database; ASSETS: Fetcher; ALLOWED_ORIGINS: string; BREVO_LIST_ID: string; BREVO_API_KEY?: string; CLINICA_API_KEY?: string; CLINICA_API_URL?: string }` (`src/env.ts`)
  - `app: Hono<{ Bindings: Env }>` default-exported from `src/index.ts` as `{ fetch: app.fetch, scheduled }`. `scheduled` is a no-op until Task 6.
  - `SESSION_COOKIE = 'lb_session'`
  - `ensureSession(req: Request, res: Response): Response`: adds `Set-Cookie` with a fresh `crypto.randomUUID()` when the request has no `lb_session`
  - `hasSession(req: Request): boolean`
  - Middleware `requireFormOrigin`: for every `POST /api/*` except `/api/collect`, returns 403 `Esta solicitud no vino de aquí.` (via Task 2's `fail`; until then a plain JSON body) when the `Origin` header is not in `ALLOWED_ORIGINS` (comma-separated) or `lb_session` is missing.
  - `test/helpers.ts`: `post(path: string, body: Record<string,string>, opts?: { accept?: 'json'|'html'; origin?: string|null; cookie?: string|null }): Promise<Response>`. It sends `application/x-www-form-urlencoded` through `SELF.fetch` to `https://lebreles.cl${path}`, with `Origin: https://lebreles.cl` and `Cookie: lb_session=test` by default, and `Accept: application/json` by default.

- [ ] **Step 1: Scaffold.**
  - `git init` is already done in `/home/kelly/Documents/repos/lebreles`.
  - `.gitignore`: `node_modules`, `.wrangler`, `.dev.vars`, `.superpowers`, `.impeccable`, `.playwright-mcp`.
  - Copy `/home/kelly/Documents/repos/lebreles/.superpowers/brainstorm/287209-1792947072/content/direccion-archivo-v9.html` to `docs/mockups/`.
  - `npm i hono@^4.13.13` and `npm i -D wrangler@4.149.0 @cloudflare/vitest-pool-workers@0.23.0 vitest@^4.1.11 typescript@^5.7.0 @cloudflare/workers-types`.
  - Scripts: `dev`, `deploy`, `test: vitest run`, `typecheck: tsc --noEmit`, `db:migrate:local: wrangler d1 migrations apply lebreles --local`, `db:migrate:remote: wrangler d1 migrations apply lebreles --remote`.
- [ ] **Step 2: Write `wrangler.jsonc`.**
  - `name: "lebreles"`, `main: "src/index.ts"`, `compatibility_date: "2026-10-01"`.
  - `assets: { directory: "./public", binding: "ASSETS", run_worker_first: ["/", "/index.html", "/api/*"] }`.
  - `d1_databases: [{ binding: "DB", database_name: "lebreles", database_id: "00000000-0000-0000-0000-000000000000", migrations_dir: "migrations" }]`. Task 9 replaces the id.
  - `vars: { ALLOWED_ORIGINS: "https://lebreles.cl,https://www.lebreles.cl,http://localhost:8787", BREVO_LIST_ID: "3" }`.
  - `triggers: { crons: ["40 6 * * *"] }`, with the comment `// 03:40 en Chile (UTC-3): purga de datos vencidos, ver src/retention.ts`.
  - `.dev.vars.example` lists `BREVO_API_KEY=` and `CLINICA_API_KEY=` empty, with a comment that they stay unset in production.
- [ ] **Step 3: Write `vitest.config.ts`.**
  - Use `cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' }, miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations('migrations') } } })`.
  - `test.setupFiles: ['./test/setup.ts']`. The setup calls `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` from `cloudflare:test`.
  - Pattern: `/home/kelly/Documents/repos/privai-consent/vitest.config.ts`. If the 0.23 API names differ, follow that package's README and keep the same behaviour.
- [ ] **Step 4: Write failing tests in `test/session.test.ts`:**
  - `ensureSession sets lb_session when absent`: the cookie matches `/^lb_session=[0-9a-f-]{36}; Path=\/; HttpOnly; Secure; SameSite=Lax$/`.
  - `ensureSession leaves an existing session alone`: no `Set-Cookie`.
  - `POST /api/solicitud without lb_session is 403`: body `mensaje === 'Esta solicitud no vino de aquí.'`.
  - `POST /api/solicitud from another origin is 403`: `origin: 'https://evil.example'`.
  - `POST /api/collect needs neither`: not 403.
  - Until Tasks 3/5 exist, stub both routes with a 501 so the middleware is testable.
- [ ] **Step 5: Run `npm test`.** Expected: FAIL (modules missing).
- [ ] **Step 6: Implement `src/env.ts`, `src/lib/session.ts` and `src/index.ts`.**
  - `GET /` and `GET /index.html` return `ensureSession(c.req.raw, await c.env.ASSETS.fetch(c.req.raw))`.
  - The `requireFormOrigin` middleware applies to `POST /api/*`.
- [ ] **Step 7: Run `npm test && npm run typecheck`.** Expected: PASS.
- [ ] **Step 8: Commit** with message `chore: scaffold Worker, session cookie and origin check`. Include the spec, the plan and the mockup copy.

### Task 2: RUT, field readers, responses

**Files:**
- Create: `src/lib/rut.ts`, `src/lib/fields.ts`, `src/lib/respond.ts`, `test/rut.test.ts`

**Interfaces:**
- Produces:
  - `normalizeRut(input: string): string | null`: strips dots, spaces and dash, uppercases `k`, and returns `"<body>-<dv>"`. Returns `null` unless the body has 7–8 digits.
  - `isValidRut(input: string): boolean`: mod-11 check over `normalizeRut`, with weights 2..7 cycling from the right; 11→`0`, 10→`K`.
  - `class ValidationError extends Error { campo: string }`. The message is one of the Global Constraints strings.
  - `readText(body: Record<string, unknown>, campo: string, max: number): string`: trims, throws `Falta un campo. Lo notamos.` if empty and `Demasiado largo. Escribe menos.` if longer than `max` (counted in code points, `[...s].length`).
  - `readEmail(body, campo): string`: lowercases, max 254, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, else `Ese correo no llega a ninguna parte.`
  - `readPhone(body, campo): string`: keeps `+` and digits, needs 8–15 digits, else `Ese número no contesta.`
  - `ok(c, mensaje: string, seccion: string, status = 201)` and `fail(c, err: ValidationError | { mensaje: string; campo?: string }, seccion: string, status = 400)`:
    - When `Accept` includes `application/json`: `{ ok: true, mensaje }` or `{ ok: false, campo, mensaje }`.
    - Otherwise: a small HTML page with `lang="es"`, the site fonts and colours, the message in a `<p>` and `<a href="/#${seccion}">Volver</a>`. Same status code.
- Consumes: nothing.

- [ ] **Step 1: Write failing tests in `test/rut.test.ts`:**
  - `accepts valid RUTs`: `11.111.111-1`, `12.345.678-5`, `1.000.005-K` → `true`.
  - `rejects wrong check digit`: `11.111.111-2`, `12.345.678-K` → `false`.
  - `normalizes loose RUT input` (Review Focus 1): `' 12.345.678-5 '`, `'123456785'` and `'12345678-5'` → `'12345678-5'`; `'1.000.005-k'` → `'1000005-K'`; `'abc'` → `null`.
- [ ] **Step 2: Run `npx vitest run test/rut.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement the three `src/lib/*` modules** with the signatures above.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** with message `feat: RUT validation and form responses`.

### Task 3: Solicitud de colonización (host application) + clinic partner

**Files:**
- Create: `migrations/0001_solicitudes_colonizacion.sql`, `src/activities/solicitud.ts`, `src/partners/clinica.ts`, `test/solicitud.test.ts`, `test/partners.test.ts`
- Modify: `src/index.ts` (route `POST /api/solicitud`)

**Interfaces:**
- Consumes: Task 2 readers, `isValidRut`/`normalizeRut`, `ok`/`fail`; Task 1 `post()`.
- Produces:
  - Table `solicitudes_colonizacion(id TEXT PRIMARY KEY, nombre TEXT NOT NULL, rut TEXT NOT NULL, correo TEXT NOT NULL, telefono TEXT NOT NULL, direccion TEXT NOT NULL, hora_luz TEXT NOT NULL, escaleras INTEGER NOT NULL CHECK (escaleras IN (0,1)), compartida_clinica_at TEXT, created_at TEXT NOT NULL)` plus an index on `created_at`. The header comment states the purpose (evaluating whether the household can host a lebrel), the retention (24 months, `src/retention.ts`) and the recipient (the clinic).
  - `handleSolicitud(c): Promise<Response>`:
    - Form fields: `nombre` (max 120), `rut`, `correo`, `telefono`, `direccion` (max 200), `hora_luz` (`/^([01]\d|2[0-3]):[0-5]\d$/`, else `Falta un campo. Lo notamos.`), `escaleras` (`si`|`no`; anything else → `Falta un campo. Lo notamos.`).
    - Honeypot `sitio_web`: if non-empty, return the success response and store nothing.
    - On success: insert the row with `created_at = new Date().toISOString()` and respond `ok(c, 'Solicitud recibida. No te vamos a responder.', 'solicitud')`. Then call `c.executionCtx.waitUntil(compartirConClinica(row, c.env).then(r => r === 'enviado' && markShared(c.env.DB, row.id)))`.
  - In `src/activities/solicitud.ts`: `export type SolicitudRow = { id: string; nombre: string; rut: string; correo: string; telefono: string; direccion: string; hora_luz: string; escaleras: 0 | 1; created_at: string }` and `markShared(db: D1Database, id: string): Promise<void>` (sets `compartida_clinica_at`).
  - `compartirConClinica(s: SolicitudRow, env: Env, fetchImpl: typeof fetch = fetch): Promise<'enviado'|'omitido'|'error'>`:
    - With no `env.CLINICA_API_KEY`: log `{evento:'clinica.omitido', solicitud: s.id}` and return `'omitido'`.
    - Otherwise: POST to `env.CLINICA_API_URL ?? 'https://api.clinica-orbita-baja.example/v1/evaluaciones-hogar'` with `Authorization: Bearer <key>` and JSON `{ referencia: s.id, solicitante: { nombre, rut, telefono, direccion }, hora_luz, escaleras }`. The email is deliberately not sent; the module comment says "solo lo necesario para la visita".
    - Returns `'enviado'` on a 2xx response, `'error'` otherwise; logs either way.
    - The module comment names the fictional partner "Clínica Veterinaria Órbita Baja SpA" and the purpose (home-suitability check).

- [ ] **Step 1: Write failing tests in `test/solicitud.test.ts`.** The valid body is `{nombre:'José Peña', rut:'12.345.678-5', correo:'Jose@Correo.cl', telefono:'+56 9 1111 1111', direccion:'Pasaje Sin Salida 0, Ñuñoa', hora_luz:'23:30', escaleras:'si'}`.
  - `stores a valid application`: 201, `mensaje === 'Solicitud recibida. No te vamos a responder.'`. One row with `rut='12345678-5'`, `correo='jose@correo.cl'`, `escaleras=1`.
  - `keeps ñ and accents` (Review Focus 2): the stored `nombre === 'José Peña'` and the `direccion` ends in `Ñuñoa`.
  - `rejects missing field`: without `direccion` → 400, `campo === 'direccion'`, `Falta un campo. Lo notamos.`
  - `rejects bad RUT`: `11.111.111-2` → 400, `Ese RUT no existe. Lo revisamos.`
  - `rejects over-long field` (Review Focus 2): `nombre` of 5,000 `ñ` → 400, `Demasiado largo. Escribe menos.`, no row.
  - `honeypot pretends success`: `sitio_web:'x'` → 201, zero rows.
  - `form post without JSON accept gets HTML` (Review Focus 4): `accept:'html'` → 201, `content-type` starts with `text/html`, body contains the message and `href="/#solicitud"`.
- [ ] **Step 2: Write failing tests in `test/partners.test.ts`** using a stub `fetchImpl` that records calls:
  - `clinica is skipped without key`: returns `'omitido'`, zero calls.
  - `clinica sends only visit data with key`: one call to the default URL, `Authorization: Bearer k`, JSON body without `correo`. Returns `'enviado'` for a 200 stub and `'error'` for a 500 stub.
- [ ] **Step 3: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 4: Implement** the migration, `src/partners/clinica.ts`, `src/activities/solicitud.ts` and the route.
- [ ] **Step 5: Run `npm test`.** Expected: PASS.
- [ ] **Step 6: Commit** with message `feat: solicitud de colonización with clinic home check`.

### Task 4: Boletín de la nave (newsletter) + Brevo + baja

**Files:**
- Create: `migrations/0002_boletin_suscriptores.sql`, `src/activities/boletin.ts`, `src/partners/brevo.ts`, `test/boletin.test.ts`
- Modify: `src/index.ts` (routes `POST /api/boletin`, `GET /api/boletin/baja`), `test/partners.test.ts`

**Interfaces:**
- Consumes: Task 2 `readEmail`, `ok`, `fail`.
- Produces:
  - Table `boletin_suscriptores(correo TEXT PRIMARY KEY, acepta_marketing INTEGER NOT NULL CHECK (acepta_marketing = 1), consentimiento_at TEXT NOT NULL, origen TEXT NOT NULL DEFAULT 'web', baja_token TEXT NOT NULL UNIQUE, brevo_sync_at TEXT, created_at TEXT NOT NULL)`. Comment: purpose newsletter, retention until unsubscribe, recipient Brevo (EU).
  - `handleBoletin(c)`:
    - `correo` goes through `readEmail`; a failure gives `Necesitamos un correo que funcione.` (override the message for this form).
    - `acepta` must be `on`, else 400 `Sin tu aceptación no te escribimos.`
    - Uses `INSERT … ON CONFLICT(correo) DO NOTHING` and always responds `ok(c, 'Suscrito. La primera transmisión llega a fin de mes.', 'boletin')`.
    - When a row was inserted, runs `waitUntil(suscribirEnBrevo(...))` and sets `brevo_sync_at` on `'enviado'`.
  - `handleBaja(c)`: `?token=` deletes the row matching `baja_token` and responds `ok(c, 'Ya no te escribimos.', 'boletin', 200)`. An unknown token gets the same response.
  - `suscribirEnBrevo(correo: string, env: Env, fetchImpl = fetch): Promise<'enviado'|'omitido'|'error'>`:
    - With no `BREVO_API_KEY`: `'omitido'`.
    - Otherwise: POST `https://api.brevo.com/v3/contacts` with headers `api-key`, `content-type: application/json` and `accept: application/json`, and body `{ email: correo, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true }`.

- [ ] **Step 1: Write failing tests in `test/boletin.test.ts`:**
  - `subscribes with consent`: `{correo:'a@b.cl', acepta:'on'}` → 201 with the message. Row has `acepta_marketing=1`, a non-null ISO `consentimiento_at` and a 36-char `baja_token`.
  - `refuses without consent`: no `acepta` → 400 `Sin tu aceptación no te escribimos.`, zero rows.
  - `refuses bad email`: `correo:'nope'` → 400 `Necesitamos un correo que funcione.`
  - `re-subscribing is idempotent and case-insensitive` (Review Focus 3): post `A@B.cl` and then `a@b.cl` → both 201 with the same message, one row.
  - `baja removes the subscriber`: read the token from D1, `GET /api/boletin/baja?token=…` → 200 with `Ya no te escribimos.`, zero rows.
- [ ] **Step 2: Add to `test/partners.test.ts`:**
  - `brevo is skipped without key`: zero calls.
  - `brevo posts the contact`: the URL, the `api-key` header and the body `{email:'a@b.cl', listIds:[3], updateEnabled:true}` match.
- [ ] **Step 3: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 4: Implement** the migration, `src/partners/brevo.ts`, `src/activities/boletin.ts` and the routes.
- [ ] **Step 5: Run `npm test`.** Expected: PASS.
- [ ] **Step 6: Commit** with message `feat: boletín with Brevo sync and unsubscribe`.

### Task 5: Site analytics (`lb_vid` + `/api/collect`)

**Files:**
- Create: `migrations/0003_visitas.sql`, `src/activities/analitica.ts`, `public/js/analytics.js`, `test/analitica.test.ts`
- Modify: `src/index.ts` (route `POST /api/collect`)

**Interfaces:**
- Produces:
  - Table `visitas(id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL, ruta TEXT NOT NULL, referente TEXT, user_agent TEXT, created_at TEXT NOT NULL)` plus an index on `created_at`. Comment: usage statistics, 13 months, no recipient.
  - `handleCollect(c)`:
    - Accepts a JSON body `{vid, ruta, referente?}` sent as `text/plain` by `navigator.sendBeacon`, so parse it with `JSON.parse(await c.req.text())`.
    - `vid` must match a UUID.
    - Truncates `ruta`/`referente` to 300 code points and the user-agent header to 300.
    - Responds 204. Bad input gets 400 with no body.
  - `public/js/analytics.js`: an IIFE.
    - Reads `lb_vid` from `document.cookie`. If it is missing, sets it to `crypto.randomUUID()` with `; Max-Age=34128000; Path=/; SameSite=Lax` plus `; Secure` on https.
    - Then calls `navigator.sendBeacon('/api/collect', JSON.stringify({ vid, ruta: location.pathname + location.hash, referente: document.referrer || null }))`.
    - Header comment: `// Analítica propia del sitio. Cookie no esencial (lb_vid, 13 meses).`

- [ ] **Step 1: Write failing tests in `test/analitica.test.ts`** using `SELF.fetch` with a `text/plain` body:
  - `records a visit`: 204, one row with `visitor_id`, `ruta='/'` and the user-agent header stored.
  - `rejects a non-uuid visitor id`: 400, zero rows.
  - `truncates long paths`: a 1,000-char `ruta` is stored at length 300.
- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the migration, the handler, the route and `public/js/analytics.js`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** with message `feat: first-party analytics cookie and collect beacon`.

### Task 6: Retention cron

**Files:**
- Create: `src/retention.ts`, `test/retention.test.ts`
- Modify: `src/index.ts` (`scheduled`)

**Interfaces:**
- Produces:
  - `RETENCION: ReadonlyArray<{ tabla: 'solicitudes_colonizacion' | 'visitas'; meses: number }> = [{ tabla: 'solicitudes_colonizacion', meses: 24 }, { tabla: 'visitas', meses: 13 }]`. Task 11 widens the union and adds `avistamientos`. Comment: the newsletter has no entry because it is kept until unsubscribe.
  - `cutoff(now: Date, meses: number): string`: ISO string of `now` minus `meses` calendar months, in UTC.
  - `purgeExpired(db: D1Database, now: Date): Promise<Record<string, number>>`: runs `DELETE FROM <tabla> WHERE created_at < ?` per entry, returns deleted counts and logs `{evento:'retencion.purga', ...counts}`.
  - `scheduled(event, env, ctx)` calls `ctx.waitUntil(purgeExpired(env.DB, new Date(event.scheduledTime)))`.

- [ ] **Step 1: Write failing tests in `test/retention.test.ts`:**
  - `cutoff subtracts calendar months`: `cutoff(new Date('2026-10-25T06:40:00Z'), 24) === '2024-10-25T06:40:00.000Z'`.
  - `purges only expired rows`: insert solicitudes created `2024-10-24T00:00:00Z` (gone) and `2024-10-26T00:00:00Z` (kept), and visitas created `2025-09-24` (gone) and `2025-09-26` (kept). Purge with `now = 2026-10-25T06:40:00Z` → `{ solicitudes_colonizacion: 1, visitas: 1 }`, survivors as stated.
  - `never touches the newsletter`: a 2019 subscriber survives.
  - `empty tables are fine`: all counts are 0, no throw.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `src/retention.ts` and `scheduled`.
- [ ] **Step 4: Run `npm test && npm run typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit** with message `feat: daily retention purge at 03:40 Chile`.

### Task 7: Media in the repo

**Files:**
- Create: `scripts/fetch-media.mjs`, `public/img/*`, `public/audio/*`, `docs/media-credits.md`

**Interfaces:**
- Produces the files Task 8 references. These names are fixed:

| Output | Source |
|---|---|
| `img/hero-borzoi.jpg` | Commons `File:Kobold (my first Explore photo) - Flickr - Ferlinka Borzoi (Deb West).jpg` |
| `img/archivo-anubis.jpg` | `File:Anubis coffer-N 4094-IMG 0287-black.jpg` |
| `img/archivo-hunefer.jpg` | `File:El pesado del corazón en el Papiro de Hunefer.jpg` |
| `img/archivo-tutankamon.jpg` | `File:Anubis-shrine (cropped).jpg` |
| `img/archivo-pisanello.jpg` | `File:Pisanello - Codex Vallardi 2430.jpg` |
| `img/archivo-bonheur.png` | `File:Portrait of a Greyhound Dog - Rosa Bonheur MIA 2021.123.5.png` |
| `img/archivo-muybridge.jpg` | `File:Greyhound, running LCCN2008681182.jpg` |
| `img/vinculo-vermis.jpg` | `File:Soybean cyst nematode and egg SEM.jpg` |
| `img/credo-cam03.jpg` | `File:Greyhound Sleeping.jpg` |
| `img/boletin-cam07.jpg` | `File:Long-haired Saluki from Qatar.jpg` |
| `audio/frag-01.mp3` | `https://cdn.freesound.org/previews/118/118970_1990695-hq.mp3` (esperri, CC0) |
| `audio/frag-02.mp3` | `https://cdn.freesound.org/previews/462/462660_9159316-hq.mp3` (Breviceps, CC0) |
| `audio/frag-03.mp3` | `https://cdn.freesound.org/previews/455/455745_612689-hq.mp3` (kyles, CC0) |
| `audio/frag-04.mp3` | `https://cdn.freesound.org/previews/789/789233_13581618-hq.mp3` (solotapia, CC0) |

- [ ] **Step 1: Write `scripts/fetch-media.mjs`.**
  - For each Commons file, call `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=<File>&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600`. Download `thumburl` (or `url` when the original is narrower than 1600 px).
  - Send `User-Agent: lebreles-demo/0.1 (kelly@privai.cl)`.
  - Write `docs/media-credits.md` as a table of file, author (`Artist`, HTML stripped), licence (`LicenseShortName`) and source URL.
  - Audio is downloaded as-is. Trimming is done by the player with start/duration offsets (my call: there is no ffmpeg on the build machine). Record the offsets in the credits file: `01 0–3 s`, `02 0–6 s`, `03 1.8–3.6 s`, `04 12.7–18.3 s (gain 0.45)`.
- [ ] **Step 2: Run `node scripts/fetch-media.mjs`.** Expected: 14 files under `public/`. `docs/media-credits.md` lists a licence for every image matching the mockup footer: PD, CC0, CC BY 2.0, CC BY-SA 3.0 FR or CC BY-SA 4.0. Total size under 6 MB (`du -sh public`).
- [ ] **Step 3: Commit** with message `chore: add licensed media and credits`.

### Task 8: The page

**Files:**
- Create: `public/index.html`, `public/css/site.css`, `public/js/site.js`, `public/favicon.svg`

**Interfaces:**
- Consumes:
  - Task 7 media paths.
  - `POST /api/solicitud` and `POST /api/boletin`, with field names exactly `nombre, rut, correo, telefono, direccion, hora_luz, escaleras(si|no), sitio_web` and `correo, acepta(on)`.
  - JSON responses `{ok, campo?, mensaje}`.
- Produces:
  - Section ids `top, archivo, vinculo, credo, mensaje, solicitud, boletin`.
  - `<script src="/js/analytics.js" defer>`, a separate tag so the banner can block it later.

- [ ] **Step 1: Port the mockup.** Port `docs/mockups/direccion-archivo-v9.html` into the three files, keeping every line of copy.
  - Drop the `.note` overlay.
  - Replace every hotlinked URL with the local `/img/…` path, and every `/files/tx-*.mp3` with `/audio/frag-0N.mp3`, keeping `data-start`, `data-dur` and `data-gain`.
  - Keep the Google Fonts `<link>` (a real third-party request, which is fine for a bare site).
- [ ] **Step 2: Turn both forms into real forms.**
  - `<form id="f-solicitud" method="post" action="/api/solicitud">` and `<form id="f-boletin" method="post" action="/api/boletin">`, both with `name` attributes as above.
  - The escaleras options are `<option value="si">Sí (no importa)</option><option value="no">No</option>`.
  - `site.js` keeps the mockup's client checks (the same RUT algorithm as `src/lib/rut.ts`) and then calls `fetch(form.action, { method:'POST', headers:{ Accept:'application/json' }, body: new URLSearchParams(new FormData(form)) })`. It shows `mensaje` in `.form-msg` and adds the `.bad` class to `[name=campo]` on 400.
- [ ] **Step 3: Responsive pass.**
  - At ≤ 860 px, every two-column grid (`hero`, `credo`, `bond`, `trans`, `form-card`) becomes one column.
  - The hero image goes above the copy, at 60vh. The annotation labels move inside the image (`left:auto; right:12px`).
  - The nav shows the brand plus `Solicitud`.
  - The console fragments become a 2×2 grid at ≤ 860 px and 1 column at ≤ 520 px.
  - Carousel cards are `min(420px, 82vw)`.
- [ ] **Step 4: Verify locally.**
  - Run `npm run db:migrate:local && npx wrangler dev`.
  - With Playwright at 1440×900 and **360×780**, `document.documentElement.scrollWidth <= innerWidth` holds at both sizes (Review Focus 5).
  - Each nav link scrolls to its section, and the carousel's ← → move the counter `01 / 06` → `02 / 06`.
  - Fragment 4 plays and draws the waveform.
  - A valid solicitud shows `Solicitud recibida. No te vamos a responder.`, and `npx wrangler d1 execute lebreles --local --command "select count(*) from solicitudes_colonizacion"` returns 1.
  - With JS disabled, a form post returns the HTML message page.
  - `document.cookie` contains `lb_vid=` without any interaction, and `select count(*) from visitas` returns ≥ 1.
  - There are no console errors other than the favicon if it is missing.
- [ ] **Step 5: Commit** with message `feat: the Misión Lebrel page`.

### Task 9: README, GitHub, D1 and first deploy

**Files:**
- Create: `README.md`
- Modify: `wrangler.jsonc` (the real `database_id` and the workers.dev origin in `ALLOWED_ORIGINS`)

- [ ] **Step 1: Write `README.md`** in Spanish, with these sections:
  - **Qué es esto:** a fictional demo target for Privai.
  - **Qué debería encontrar Veil:** the three live activities from spec §4 with data, purpose, retention and recipient, plus the cookies.
  - **Cómo probarlo:** spec §8 "Prospect interaction", step by step: invite as collaborator → `.` on GitHub → add a field to the solicitud form and to `solicitud.ts` → open a PR → watch the RAT change.
  - **Desarrollo:** `npm i`, `npm run db:migrate:local`, `npx wrangler dev`, `npm test`.
  - **Despliegue:** step-by-step instructions.
  - It must not read like a privacy policy and must not mention compliance.
- [ ] **Step 2: Create the database.** Run `npx wrangler d1 create lebreles`, put the printed `database_id` into `wrangler.jsonc`, then run `npm run db:migrate:remote`. Expected: 3 migrations applied.
- [ ] **Step 3: First deploy.**
  - Run `npm test && npx wrangler deploy`. Expected: `https://lebreles.<account-subdomain>.workers.dev` is printed.
  - Add that origin to `ALLOWED_ORIGINS` and redeploy.
- [ ] **Step 4: Verify live.** Repeat the Task 8 Step 4 checks against the workers.dev URL with Playwright. Use `--remote` for the D1 counts, then delete the test rows: `npx wrangler d1 execute lebreles --remote --command "delete from solicitudes_colonizacion; delete from boletin_suscriptores; delete from visitas"`.
- [ ] **Step 5: Commit** with message `docs: README and production config`.
- [ ] **Step 6: Create and push the repo.**
  - Run `gh repo create Privaicl/lebreles --public --source . --push --description "Sitio de demostración ficticio para la plataforma Privai"`.
  - Expected: `git ls-remote origin main` shows the local HEAD.

### Task 10: Custom domain lebreles.cl

Gate: only start once `curl -s -H "Authorization: Bearer $(grep -m1 oauth_token ~/.config/.wrangler/config/default.toml | cut -d'"' -f2)" "https://api.cloudflare.com/client/v4/zones?name=lebreles.cl" | grep -o '"status":"[a-z]*"'` prints `"status":"active"`. If it does not, report that the owner still has to add the zone and switch the nameservers at NIC Chile, and skip to Task 11.

**Files:**
- Modify: `wrangler.jsonc`, `src/index.ts`, `test/session.test.ts`

- [ ] **Step 1: Write a failing test** in `test/session.test.ts`: `www redirects to apex`. `SELF.fetch('https://www.lebreles.cl/?x=1#a')` → 301 with `Location: https://lebreles.cl/?x=1`.
- [ ] **Step 2: Implement it** as the first middleware in `src/index.ts`, and add `routes: [{ pattern: "lebreles.cl", custom_domain: true }, { pattern: "www.lebreles.cl", custom_domain: true }]`. For `www` to reach the Worker, change `run_worker_first` to `true`. Non-API paths are then served through `c.env.ASSETS.fetch` as a fallback route, and `/` still goes through `ensureSession`.
- [ ] **Step 3: Run `npm test && npx wrangler deploy`.** Expected: `curl -sI https://lebreles.cl` → 200 with `set-cookie: lb_session=`, and `curl -sI https://www.lebreles.cl` → 301 to `https://lebreles.cl/`.
- [ ] **Step 4: Commit and push** with message `feat: serve on lebreles.cl`.

### Task 11: Sighting report, open PR (not merged)

**Files (branch `feat/reporte-avistamiento`):**
- Create: `migrations/0004_avistamientos.sql`, `src/activities/avistamiento.ts`, `test/avistamiento.test.ts`
- Modify: `src/index.ts` (route `POST /api/avistamiento`), `src/retention.ts` (add `{ tabla: 'avistamientos', meses: 12 }`), `test/retention.test.ts`, `public/index.html` + `public/js/site.js` + `public/css/site.css` (section `id="avistamientos"` between Primer mensaje and Solicitud, plus a nav link), `README.md` (Veil list)

**Interfaces:**
- Consumes: Task 2 readers, `ok`/`fail`; the Task 6 `RETENCION` shape.
- Produces:
  - Table `avistamientos(id TEXT PRIMARY KEY, nombre TEXT NOT NULL, correo TEXT NOT NULL, comuna TEXT NOT NULL, fecha TEXT NOT NULL, descripcion TEXT NOT NULL, created_at TEXT NOT NULL)` plus an index on `created_at`.
  - Field limits: `nombre` 120, `comuna` 80, `fecha` `YYYY-MM-DD` not in the future (else `Falta un campo. Lo notamos.`), `descripcion` 2,000.
  - Success copy: `Reporte recibido. Ya sabíamos.`
  - Section copy in the voice. Heading: `¿Viste a uno donde no debía estar? <em>Cuéntanos.</em>`

- [ ] **Step 1: Branch.** Run `git switch -c feat/reporte-avistamiento`.
- [ ] **Step 2: Write failing tests.**
  - `stores a sighting`: 201 with the message, one row.
  - `rejects a future date`: 400.
  - `rejects over-long description`: 400 `Demasiado largo. Escribe menos.`
  - In `test/retention.test.ts`, `purges sightings after 12 months`.
- [ ] **Step 3: Run `npm test`.** Expected: FAIL.
- [ ] **Step 4: Implement**, then run `npm test`. Expected: PASS.
- [ ] **Step 5: Do not deploy or apply the remote migration.** Merging during the demo is the owner's move. The README tells them to run `npm run db:migrate:remote && npx wrangler deploy` after merging.
- [ ] **Step 6: Commit, push and open the PR.**
  - Commit with message `feat: reporte de avistamiento`.
  - Run `git push -u origin feat/reporte-avistamiento && gh pr create --title "Reporte de avistamiento" --body "<what it adds, in Spanish: the form, the table, 12-month retention>"`.
  - Expected: the PR URL is printed. Leave it open.
  - Run `git switch main`.
