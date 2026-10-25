// Descarga las imágenes y audios del sitio a public/ y escribe docs/media-credits.md.
// Uso: node scripts/fetch-media.mjs && python3 scripts/compress-images.py
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const UA = { 'User-Agent': 'lebreles-demo/0.1 (kelly@privai.cl)' }

const images = [
  ['img/hero-borzoi.jpg', 'File:Kobold (my first Explore photo) - Flickr - Ferlinka Borzoi (Deb West).jpg'],
  ['img/archivo-anubis.jpg', 'File:Anubis coffer-N 4094-IMG 0287-black.jpg'],
  ['img/archivo-hunefer.jpg', 'File:El pesado del corazón en el Papiro de Hunefer.jpg'],
  ['img/archivo-tutankamon.jpg', 'File:Anubis-shrine (cropped).jpg'],
  ['img/archivo-pisanello.jpg', 'File:Pisanello - Codex Vallardi 2430.jpg'],
  ['img/archivo-bonheur.jpg', 'File:Portrait of a Greyhound Dog - Rosa Bonheur MIA 2021.123.5.png'],
  ['img/archivo-muybridge.jpg', 'File:Greyhound, running LCCN2008681182.jpg'],
  ['img/vinculo-vermis.jpg', 'File:Soybean cyst nematode and egg SEM.jpg'],
  ['img/credo-cam03.jpg', 'File:Greyhound Sleeping.jpg'],
  ['img/boletin-cam07.jpg', 'File:Long-haired Saluki from Qatar.jpg'],
]

// Audio CC0 de Freesound. El reproductor toca solo el tramo indicado (no hay recorte del archivo).
const audio = [
  ['audio/frag-01.mp3', 'https://cdn.freesound.org/previews/118/118970_1990695-hq.mp3', 'esperri', 'https://freesound.org/s/118970/', '0–3 s'],
  ['audio/frag-02.mp3', 'https://cdn.freesound.org/previews/462/462660_9159316-hq.mp3', 'Breviceps', 'https://freesound.org/s/462660/', '0–6 s'],
  ['audio/frag-03.mp3', 'https://cdn.freesound.org/previews/455/455745_612689-hq.mp3', 'kyles', 'https://freesound.org/s/455745/', '1.8–3.6 s'],
  ['audio/frag-04.mp3', 'https://cdn.freesound.org/previews/789/789233_13581618-hq.mp3', 'solotapia', 'https://freesound.org/s/789233/', '12.7–18.3 s (ganancia 0.45)'],
]

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

async function save(rel, url) {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const out = join(root, 'public', rel)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, Buffer.from(await res.arrayBuffer()))
}

const rows = []
for (const [rel, title] of images) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: title, prop: 'imageinfo',
    iiprop: 'url|extmetadata|size', iiurlwidth: '1600',
  })
  const data = await (await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: UA })).json()
  const page = Object.values(data.query.pages)[0]
  const info = page.imageinfo[0]
  const meta = info.extmetadata
  await save(rel, info.width > 1600 ? info.thumburl : info.url)
  rows.push(`| \`${rel}\` | ${strip(meta.Artist?.value) || '—'} | ${meta.LicenseShortName?.value ?? '—'} | ${info.descriptionurl} |`)
  console.log('ok', rel)
}
for (const [rel, url, author, page, tramo] of audio) {
  await save(rel, url)
  rows.push(`| \`${rel}\` | ${author} (tramo ${tramo}) | CC0 | ${page} |`)
  console.log('ok', rel)
}

await writeFile(
  join(root, 'docs/media-credits.md'),
  `# Créditos de imágenes y audio\n\nGenerado por \`scripts/fetch-media.mjs\`.\n\n| Archivo | Autor | Licencia | Fuente |\n|---|---|---|---|\n${rows.join('\n')}\n`,
)
