import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const metadataPath = path.join(root, 'src/config/installer.generated.json')

function fail(message) {
  console.error(`\n✖ verify-download: ${message}\n`)
  process.exit(1)
}

if (!existsSync(metadataPath)) fail('Installer metadata is missing. Run the website build first.')
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
if (!metadata.available || !metadata.url) fail('No installer is available.')
if (metadata.signature !== 'developer-id' || metadata.notarized !== true) {
  fail(`Refusing a production download that is ${metadata.signature ?? 'unverified'} and ${metadata.notarized ? 'notarized' : 'not notarized'}.`)
}

if (metadata.url.startsWith('/')) {
  if (!metadata.url.startsWith('/downloads/') || !metadata.url.endsWith('.dmg')) fail(`Unsafe same-origin installer path: ${metadata.url}`)
  const file = path.join(root, 'dist', metadata.url.slice(1))
  if (!existsSync(file)) fail(`${metadata.url} is not present in web/dist.`)
  if (statSync(file).size < 1_000_000) fail(`${metadata.url} is too small to be a DMG.`)
  const bytes = readFileSync(file)
  if (bytes.subarray(Math.max(0, bytes.length - 512), Math.max(0, bytes.length - 508)).toString('ascii') !== 'koly') fail(`${metadata.url} does not have a DMG koly trailer.`)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== metadata.sha256) fail(`SHA-256 mismatch for ${metadata.url}.`)
  console.log(`✓ verified ${metadata.url} (${bytes.length} bytes, SHA-256 ${sha256})`)
} else {
  const url = new URL(metadata.url)
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !url.pathname.endsWith('.dmg')) fail(`Unsafe external installer URL: ${metadata.url}`)
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  if (!response.ok) fail(`${metadata.url} returned HTTP ${response.status}.`)
  const type = response.headers.get('content-type') ?? ''
  if (type.includes('text/html')) fail(`${metadata.url} returned HTML (${type}), not a DMG.`)
  const length = Number(response.headers.get('content-length') ?? '0')
  if (length > 0 && length < 1_000_000) fail(`${metadata.url} is only ${length} bytes.`)
  console.log(`✓ ${metadata.url} returned HTTP ${response.status}, ${type || 'unknown content type'}${length ? `, ${length} bytes` : ''}`)
}
