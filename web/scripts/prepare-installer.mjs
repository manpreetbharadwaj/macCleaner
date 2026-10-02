// Finds the macOS installer for the app's *current* version, verifies it,
// copies it into public/downloads/ and writes src/config/installer.generated.json —
// the single source of truth the site uses for the download link, file name,
// size, checksum, supported architectures and signing status.
//
// Nothing here is typed in by hand: version comes from tauri.conf.json,
// architectures from `lipo`, signing from `codesign` / `stapler`, all read
// from the app inside the DMG itself.
//
// Runs automatically before `npm run dev` and `npm run build`.
// - If VITE_MAC_DOWNLOAD_URL is set (e.g. a GitHub Release asset), that URL is
//   used for the link; upload exactly the DMG this script reports.
// - A production build fails if there's no installer and no override, so a
//   broken or "coming soon" download can never ship by accident.
//   (Set ALLOW_MISSING_INSTALLER=1 to build anyway.)

import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const web = path.resolve(import.meta.dirname, '..')
const root = path.resolve(web, '..')
const mode = process.argv[2] ?? 'build'
const outJson = path.join(web, 'src/config/installer.generated.json')
const downloadsDir = path.join(web, 'public/downloads')

const tauriConf = JSON.parse(readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf-8'))
const version = tauriConf.version
const product = tauriConf.productName // "MacBook Cleaner"
const dmgDir = path.join(root, 'src-tauri/target/release/bundle/dmg')

function readEnv(name) {
  if (process.env[name]) return process.env[name].trim()
  // Mirror Vite's env files so the override behaves the same everywhere.
  for (const file of [`.env.${mode === 'build' ? 'production' : 'development'}.local`, `.env.${mode === 'build' ? 'production' : 'development'}`, '.env.local', '.env']) {
    const p = path.join(web, file)
    if (!existsSync(p)) continue
    const line = readFileSync(p, 'utf-8').split('\n').find((l) => l.startsWith(`${name}=`))
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function fail(message) {
  console.error(`\n✖ prepare-installer: ${message}\n`)
  if (mode === 'build' && process.env.ALLOW_MISSING_INSTALLER !== '1') process.exit(1)
}

/** `MacBook Cleaner_1.0.0_aarch64.dmg` etc. — only for the version in tauri.conf.json. Universal wins. */
function findDmg() {
  if (!existsSync(dmgDir)) return null
  const prefix = `${product}_${version}_`
  const candidates = readdirSync(dmgDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.dmg'))
    .map((f) => ({ f, arch: f.slice(prefix.length, -4), mtime: statSync(path.join(dmgDir, f)).mtimeMs }))
    .sort((a, b) => (a.arch === 'universal' ? -1 : b.arch === 'universal' ? 1 : b.mtime - a.mtime))
  return candidates[0] ? path.join(dmgDir, candidates[0].f) : null
}

/** Mounts the DMG read-only and inspects the app inside it. */
function inspect(dmg) {
  const mount = mkdtempSync(path.join(tmpdir(), 'mbc-dmg-'))
  sh('/usr/bin/hdiutil', ['attach', dmg, '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount])
  try {
    const app = path.join(mount, `${product}.app`)
    if (!existsSync(app)) throw new Error(`${product}.app is not inside ${path.basename(dmg)}`)
    const plist = path.join(app, 'Contents/Info.plist')
    const read = (key) => sh('/usr/libexec/PlistBuddy', ['-c', `Print ${key}`, plist]).trim()
    const exe = path.join(app, 'Contents/MacOS', read('CFBundleExecutable'))
    const archs = sh('/usr/bin/lipo', ['-archs', exe]).trim().split(/\s+/)
    // codesign -dv reports on stderr, even on success.
    const codesign = spawnSync('/usr/bin/codesign', ['-dv', app], { encoding: 'utf-8' }).stderr ?? ''
    const signature = /Signature=adhoc/.test(codesign) ? 'adhoc' : /Authority=Developer ID Application/.test(codesign) ? 'developer-id' : /Authority=/.test(codesign) ? 'other' : 'unsigned'
    let notarized = false
    try {
      sh('/usr/bin/xcrun', ['stapler', 'validate', app])
      notarized = true
    } catch {
      notarized = false
    }
    return {
      bundleVersion: read('CFBundleShortVersionString'),
      minimumSystemVersion: read('LSMinimumSystemVersion'),
      architectures: archs,
      signature,
      notarized,
    }
  } finally {
    try {
      sh('/usr/bin/hdiutil', ['detach', mount, '-quiet'])
    } catch {
      sh('/usr/bin/hdiutil', ['detach', mount, '-force', '-quiet'])
    }
    rmSync(mount, { recursive: true, force: true })
  }
}

const override = readEnv('VITE_MAC_DOWNLOAD_URL')
const dmg = findDmg()
mkdirSync(path.dirname(outJson), { recursive: true })

if (!dmg) {
  writeFileSync(outJson, JSON.stringify({ available: Boolean(override), url: override || null, version }, null, 2) + '\n')
  if (!override) {
    fail(`No installer for version ${version} in ${path.relative(root, dmgDir)}/. Run \`npm run tauri:build\` in the project root first, or set VITE_MAC_DOWNLOAD_URL.`)
  } else {
    console.warn(`⚠ prepare-installer: no local DMG to verify; using VITE_MAC_DOWNLOAD_URL as-is (${override}).`)
  }
  process.exit(0)
}

const info = inspect(dmg)
if (info.bundleVersion !== version) {
  fail(`${path.basename(dmg)} contains version ${info.bundleVersion}, but tauri.conf.json says ${version}. Rebuild the app.`)
  process.exit(0)
}

const bytes = readFileSync(dmg)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const archLabel = info.architectures.length > 1 ? 'universal' : info.architectures[0] === 'arm64' ? 'apple-silicon' : 'intel'
const fileName = `MacBook-Cleaner-${version}-${archLabel}.dmg`

let url = override
if (!override) {
  mkdirSync(downloadsDir, { recursive: true })
  // Keep only the current installer in the deploy.
  for (const f of readdirSync(downloadsDir)) if (f.endsWith('.dmg') && f !== fileName) rmSync(path.join(downloadsDir, f))
  copyFileSync(dmg, path.join(downloadsDir, fileName))
  url = `/downloads/${fileName}`
}

const meta = {
  available: true,
  url,
  hostedWithSite: !override,
  fileName,
  version,
  sizeBytes: bytes.length,
  sha256,
  builtAt: new Date(statSync(dmg).mtimeMs).toISOString(),
  minimumSystemVersion: info.minimumSystemVersion,
  architectures: info.architectures,
  signature: info.signature,
  notarized: info.notarized,
  source: path.relative(root, dmg),
}
writeFileSync(outJson, JSON.stringify(meta, null, 2) + '\n')
console.log(`✓ installer: ${fileName} (${(bytes.length / 1e6).toFixed(1)} MB, ${info.architectures.join('+')}, ${info.signature}${info.notarized ? ', notarized' : ', not notarized'}) → ${url}`)
console.log(`  sha256 ${sha256}`)
