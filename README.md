# Misión Lebrel en la Tierra · lebreles.cl

Sitio de demostración **ficticio**. Lo usa Privai para mostrar sus módulos funcionando sobre algo
parecido a un sitio real: un Worker de Cloudflare que recibe formularios, guarda datos personales
en D1, comparte algunos con terceros y deja una cookie de analítica.

Nada de esto es real. Los lebreles no colonizan la Tierra (que sepamos) y nadie lee las solicitudes.

## Qué debería encontrar Veil

| Actividad | Datos | Finalidad | Conservación | Destinatario | Código |
|---|---|---|---|---|---|
| Solicitud de colonización | nombre, RUT, correo, teléfono, dirección, hora en que apaga la luz, si la casa tiene escaleras | Evaluar si el hogar puede recibir a un lebrel | 24 meses | Clínica Veterinaria Órbita Baja SpA (visita de evaluación; no recibe el correo) | `src/activities/solicitud.ts`, `src/partners/clinica.ts`, `migrations/0001_*.sql` |
| Analítica del sitio | id aleatorio del visitante (cookie `lb_vid`), ruta, sitio de origen, navegador | Estadísticas de uso | 13 meses | Ninguno | `src/activities/analitica.ts`, `public/js/analytics.js`, `migrations/0003_*.sql` |

Cookies:

- `lb_session`: esencial. Solo comprueba que los formularios salen de nuestra página.
- `lb_vid`: analítica, no esencial, 13 meses. Se crea al cargar la página, sin preguntar.

Los plazos se aplican con un cron diario a las 03:40 (hora de Chile), en `src/retention.ts`.
La clínica solo recibe datos si su clave está configurada. En producción no lo está.

El sitio no tiene boletín: el consentimiento para recibirlo se pide y se gestiona en Privai.

La página carga además las fuentes desde Google Fonts.

## Cómo probarlo

Una persona puede cambiar el código y ver cómo cambia el RAT en Veil antes de hacer merge.

1. Agrega a la persona (o una cuenta de demo) como **colaboradora** del repo. Veil analiza los PR
   abiertos solo si los abre un colaborador; los de forks o externos los analiza recién al hacer merge.
2. La persona abre el repo en GitHub y aprieta `.` para abrir el editor en el navegador.
3. Agrega un campo a la solicitud, por ejemplo "fecha de nacimiento":
   en `public/index.html` (el formulario), en `src/activities/solicitud.ts` (leerlo y guardarlo) y
   en una migración nueva en `migrations/` (la columna).
4. Hace commit en una rama nueva y abre un PR.
5. En Veil, el RAT muestra el dato nuevo en la actividad "Solicitud de colonización".

Ya hay un PR listo para la demo: **Reporte de avistamiento**, que agrega una actividad nueva.
Al hacer merge, el CI aplica la migración nueva y despliega solo.

## Desarrollo

```bash
npm install
npm run db:migrate:local
npx wrangler dev        # http://localhost:8787
npm test
npm run typecheck
```

Las imágenes y audios ya están en `public/`. Para volver a descargarlos:
`node scripts/fetch-media.mjs && python3 scripts/compress-images.py`
(créditos en `docs/media-credits.md`).

## Despliegue

Automático con GitHub Actions (`.github/workflows/ci.yml`):

- Cada PR corre `typecheck` y los tests.
- Cada push a `main` (por ejemplo, al hacer merge de un PR) corre los tests, aplica las migraciones
  de D1 pendientes y despliega el Worker.

El workflow necesita dos secretos del repo: `CLOUDFLARE_API_TOKEN` (token con permisos de
Workers Scripts y D1, edición) y `CLOUDFLARE_ACCOUNT_ID`.

A mano, desde una máquina con `wrangler login`:

```bash
npm run db:migrate:remote
npx wrangler deploy
```

La base D1 se llama `lebreles`. El dominio `lebreles.cl` se conecta al Worker desde `wrangler.jsonc`
cuando la zona esté activa en Cloudflare.
