# lebreles.cl — demo site for the Privai platform

**Date:** 2026-10-25
**Status:** Approved by the owner 2026-10-25 (mockup v9)

## 1. Intent

A new way of building Privai demos (separate from `privai-demo-factory`): a standalone,
fictional-but-realistic small website with its own domain and its own code repo, whose only job
is to be *something resembling real use* for the Privai modules to work on:

- **Veil v3** links the GitHub repo through its GitHub App ("Veil Agent"), mirrors it, and
  builds RATs (registros de actividades de tratamiento) from the code. The code must therefore
  contain real-looking personal-data processing: distinct activities, purposes, data categories,
  storage, retention and recipients that a lawyer would recognise.
- **privai-consent (cookie banner)** and **privacy-center** get added on top of the site later,
  as part of the demo. The site **launches bare**: no banner, no privacy center, and a
  non-essential cookie set without asking, so the "before" state is visibly non-compliant and the
  banner has something to gate.

The site itself does nothing useful with the data. Nobody reads the submissions.

## 2. The joke, the voice and the look (decided with the owner)

Lebreles (sighthounds: galgos, whippets, borzois, salukis…) are a friendly alien species that has
lived among humans for five thousand years. The site is **written by them**, in first person
plural ("nosotros"), addressed to humans ("ustedes"), in Spanish (Chile).

**Lore.** The site is the official page of the lebreles' **mission to colonise Earth**. The
colonisation is **consensual** with humans, implied rather than stated ("Ustedes la aceptaron hace
mucho tiempo, con los ojos."). They landed in 3112 a. C. in a ship shaped like a three-seat sofa. The mothership,
**NV-MOTHER-ALPHA**, stayed in low orbit "behind the Moon"; they stayed on the sofa, advancing house
by house. They talk to the mothership by **moving their ears and by squealing** (chillidos), mostly
at 3:40 a.m. when the signal is bad.

**El Vínculo (the parasite).** When a lebrel holds your gaze for more than four seconds it passes you
a microscopic worm, *Vermis amorōsus*, which lodges behind your left eye and makes you love them
forever and keep opening the door for them. "El proceso es irreversible y
completamente voluntario. Nadie te obligó a mirar." Illustrated with a **real worm image** (a
public-domain USDA SEM micrograph of a nematode and its egg) and a list of "conducta observada en humanos vinculados" (wake at 3:40, leave the patio door
ajar, don't remember deciding any of this). The consent joke is deliberate: it is a consent-platform demo.

**Presence on Earth / worship.** The Archivo opens with **Egyptian Anubis** (real photos: the Louvre
Anubis coffer, the Papyrus of Hunefer's weighing of the heart, Harry Burton's 1922 photo of
Tutankhamun's Anubis shrine). Then Pisanello, Rosa Bonheur, Muybridge.

The adoption form becomes **"Solicitud de colonización"** ("Si aceptas ser colonizado, déjanos la
dirección."). Same data and purpose as §4.

**Voice: cryptid, not cute.** Absurd but unsettling, like found records of something that should
not exist: deadpan, short, slightly menacing, never sweet or cloying (no "mi guagua", no cheese,
blankets or cuddly jokes). Think trail-cam footage, archive gaps, redactions, 3:40 a.m. The humour is
dread stated flatly; darker is better than cuter. Placeholders are bleak, not silly (`Pasaje Sin Salida 0, Comuna Sin Nombre`). Always written by them, always consensual ("ustedes nos abrieron"). Banned:
exclamation marks, emoji, puns, winking at the reader, and stock AI phrasing ("no es X, es Y",
"con todo respeto", tidy three-item lists, aphorisms with a colon reveal).
**The v9 mockup is the source of truth for all copy.** Reference lines:
- "Siempre hemos estado aquí. Ustedes nos abrieron la puerta."
- "Antes de Keops, ya estábamos." (Archivo heading, nothing else)
- "Egipto. Nos entregaron a sus muertos. Nunca los devolvimos."
- "Muybridge, 1887. Doce placas. Eran trece. En la que falta se ve hacia dónde corríamos."
- "Los vinculados no sienten miedo. Sienten amor. Desde ese día dejan la puerta abierta."
- "No estamos durmiendo. Estamos informando y descargando las últimas actualizaciones de la nave madre."
- "No subimos escaleras. Esperamos abajo."
- "Las solicitudes se revisan de noche. No respondemos."
- "Una vez al mes te escribimos. No contestes."

**Visual treatment for the cryptid tone:** trail-cam / night-vision overlays on some photos
(muted green IR grade, `CAM-03 · LIVING · 2019-06-14 03:40:12` timestamps, `REC ●`), faint
scanlines on the hero, redaction bars in captions, desaturated archive images.

**Section "Primer mensaje a la humanidad" (decided).** The first message sent from NV-MOTHER-ALPHA
(14 March 1977, 3:40, caught by a radio telescope in Coquimbo and archived as "interferencia de
perro"). A "signal console" with real **dog squeal/whine recordings** (CC0, Freesound: esperri
118970, Breviceps 462660, kyles 455745, solotapia 789233 or better picks), split into fragments,
each with a deadpan "official translation"; a live oscilloscope drawn from the playing audio (Web
Audio analyser). No "alfabeto de orejas" (removed by the owner). Audio files are trimmed and stored in the
repo; playback only on click (no autoplay). This section collects no data.

**Look: "El Archivo Lebrel".** Mysterious, alien, artistic, with soul. Deep night palette
(near-black indigo, bone text, a gold accent, a phosphor-green "scanner" accent used only for
annotations), film grain, a faint starfield. Display serif (Cormorant Garamond) + monospace for
annotations (IBM Plex Mono) + a grotesk for body (Schibsted Grotesk). **Real imagery, not
drawings**: real photographs of sighthounds and public-domain artworks (Pisanello, Rosa Bonheur,
Muybridge, tapestries, Egyptian art), treated with subtle grading. Annotations on photos read like
a scanner ("ojo · infección parasitaria", "oreja · transmisión a la nave"). Images come from
Wikimedia Commons under free licences, are **stored in the repo** (no hotlinking), and get credited
in the footer as each licence requires. Reference mockup:
`.superpowers/brainstorm/*/content/direccion-archivo-v9.html` (copied to `docs/mockups/` in the
first commit).

Page order: hero → Archivo (Anubis and artworks, as a horizontal carousel with prev/next buttons and a counter, swipeable on mobile) → El Vínculo (parasite) → El Credo →
Primer mensaje (audio) → Solicitud de colonización (form) → Boletín (newsletter) → footer (fictional-site notice +
image credits). Organisation name: "Misión Lebrel en la Tierra · Delegación Chile". It must be clearly
fictional and must not imitate any real organisation.

## 3. Goals, non-goals, anti-goals

**Goals**
- Funny, polished, single landing page plus forms, live at `https://lebreles.cl`.
- Backend runs on Cloudflare: one Worker serves the static site and the form APIs; submissions
  are stored in D1.
- The code reads like a small real company's codebase: Veil should be able to find each
  processing activity below from the code alone (handlers, schema, comments, config).
- Repo `Privaicl/lebreles` on GitHub, **public** (fictional, no secrets in the repo). The site does **not** link to it: the owner gives the URL to the prospect.

**Non-goals**
- Admin dashboard, user accounts, sending real emails, processing data in any way.
- Integrating Privai consent / privacy center now (added later during the demo).
- Using `privai-demo-factory`.

**Anti-goals** (failure even if it technically works)
- Looks like a template or a toy: one trivial "contact form → table" with nothing for Veil to find.
- Already compliant at launch (a banner, a privacy policy, consent-gated cookies): it ruins the
  "before" state.
- Breaking or depending on the Privai platform's own infrastructure.
- Collecting real people's data unexpectedly. The page should still behave like a normal site
  (it is public), but nothing is forwarded to real third parties. **Decided:** a small footer line
  "Sitio ficticio de demostración — no ingreses datos reales" (not a privacy notice, so the site
  stays non-compliant) and obviously fake placeholders in every field (e.g. RUT `11.111.111-1`,
  "Pasaje Sin Salida 0, Comuna Sin Nombre").

## 4. Processing activities (what Veil should find)

Each form is a separate activity with its own table, handler and purpose.

| Activity | Data subjects | Data | Purpose (in code comments/config) | Retention | Recipient |
|---|---|---|---|---|---|
| **Solicitud de colonización** (host application) | Applicants | name, RUT, email, phone, address (incl. comuna), lights-out time, has stairs (fields as in the v9 mockup) | Evaluate suitability to host a lebrel ("be colonised") | 24 months, then deleted by a scheduled job | Shared with a partner vet clinic (fictional) for a home-suitability check |
| **Boletín de la nave** (newsletter) | Subscribers | email, name (optional), explicit marketing opt-in checkbox + timestamp | Send the newsletter | Until unsubscribe | **Brevo** (real vendor, real API shape: contacts endpoint, `api-key` header). Brevo is based in the EU, so the RAT shows an international transfer |
| **Reporte de avistamiento** (sighting report), **later PR, see §8** | Reporters | name, email, comuna, date, free-text description (photo upload out of scope) | Catalogue sightings | 12 months | none |
| **Analítica del sitio** | Visitors | anonymous visitor id (from cookie), path, referrer, user-agent, timestamp | Usage statistics | 13 months | none (first-party) |

Recipients must exist **in the code** (a module calling the partner's API) so Veil detects them,
but they only execute when the matching secret is configured. In production the secrets are
unset, so the call is skipped and logged. No partner endpoint is ever really called.

## 5. Cookies

- `lb_session` — essential (e.g. CSRF token for the forms). HttpOnly, Secure, SameSite=Lax.
- `lb_vid` — **non-essential** analytics cookie: random visitor id, 13 months, set by
  first-party JS on page load **without asking** (bare launch). The page sends a beacon to
  `POST /api/collect`, which writes to the analytics table.

The non-essential cookie has to be set by client-side JS from a separate script file (e.g.
`/js/analytics.js`), so the consent banner can later gate it by blocking that script.

## 6. Architecture (decided)

- **One Cloudflare Worker** (TypeScript) with static assets (`assets` binding, `run_worker_first`
  for `/api/*`), **D1** for storage, schema via `wrangler d1 migrations`.
- **Cron trigger** for the retention jobs (§4, for the activities shipped in each phase), so retention is visible in code and config.
- **Custom domain** `lebreles.cl` (and `www` redirecting to the apex) attached to the Worker.
- Server-side validation of every field (including RUT check digit), a honeypot field against
  bots, JSON or form-post responses. Success/error messages are in the site's voice (from the v9
  mockup): "Solicitud recibida. No te vamos a responder.", "Ese RUT no existe. Lo revisamos.",
  "Falta un campo. Lo notamos.", "Suscrito. La primera transmisión llega a fin de mes.",
  "Sin tu aceptación no te escribimos." The page also validates in the browser (same RUT check)
  and works without JS as a plain form post.
- Footer easter egg in the style of a 90s personal homepage (like Homer Simpson's): a spinning
  pixel-art lebrel (with one glowing green eye) beside a fake visitor counter "VISITANTE N.º
  00003112" and "Página en construcción desde el 3112 a. C. Mejor vista a las 3:40."
- Nav links and hero buttons scroll to their sections; the Archivo carousel has prev/next
  buttons; audio plays only on click.

## 7. Constraints / setup the owner does

- `lebreles.cl` is not yet a zone in the Cloudflare account (`kelly@privai.cl`'s account,
  `f7c24585580e5541ef6888966ffe0575`) and has no nameservers delegated. The owner adds the
  zone in Cloudflare and switches nameservers at NIC Chile. The builder can deploy to
  `*.workers.dev` first and attach the custom domain once the zone is active.
- gh CLI (Privaicl access) and wrangler are already authenticated on the build machine.
- Git: no `Co-Authored-By` trailers or "Generated with" footers (owner's global rule).

## 8. Demo phases in the repo (decided)

The repo history is part of the demo: Veil should see the RAT change as the code changes.

1. **Launch (initial `main`):** site, adoption application, newsletter (Brevo), analytics
   cookie + collect beacon, retention cron for the shipped activities. Deployed live.
2. **Later PR, built now but not merged:** the sighting report (form section, handler,
   table + migration, retention entry). It lives on its own branch with an open PR so it
   can be merged during the demo and Veil picks up a new activity.
3. **Later, during the demo (not built now):** the privai-consent banner and privacy-center link
   are added via a commit/PR. No script-blocking markup is prepared in advance: the bare site
   stays a plain, normal site.

### Prospect interaction (decided)

A prospect can change the code themselves during a guided demo: the owner adds them (or a demo
GitHub account) as a collaborator, they edit in GitHub's web editor (`.` on the repo page),
for example adding a field to the adoption form, and open a PR. Veil analyses open PRs only from
collaborators (fork and non-collaborator PRs only at merge, per veil-v3 repo-source design §5.2),
so being a collaborator is what makes the change show up in the RAT before merging. The README gets
a short **"Cómo probarlo"** section describing this flow.

## 9. Left to the builder

- Final copy (within the voice above), choice of further images (free licence only), layout details.
- Router choice (plain Worker or Hono), test setup (vitest + `@cloudflare/vitest-pool-workers`,
  matching other Privaicl Workers repos), lint/format tooling.
- Exact table/column names, fictional partner names and API shapes.
- README describing the site as a demo target (what Veil should find, how to deploy).
