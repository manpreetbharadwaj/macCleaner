// Repeatable release build: bumps the one version of record
// (tauri.conf.json — the website already reads it via __APP_VERSION__, so
// nothing else needs editing for the version number itself), builds the
// requested architecture(s) through the existing, already-signing-aware
// build-dmg.mjs pipeline, and — if TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)
// are set in the environment — collects the updater artifacts Tauri
// already produces (createUpdaterArtifacts: true) into a single update
// manifest ready to upload to the endpoint configured in
// tauri.conf.json's plugins.updater.endpoints.
//
// Never uploads, publishes, tags, commits, or pushes anything — see
// "Exact next steps" it prints at the end. Never reads or writes the
// private signing key itself; it only checks whether the env vars that
// name it are present, and otherwise skips updater-artifact collection
// with a clear message (a release can still be built and distributed
// manually without updater support for that version).
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const tauriConfPath = path.join(root, 'src-tauri/tauri.conf.json')
const changelogPath = path.join(root, 'web/src/data/changelog.ts')
const releaseDir = path.join(root, 'release')

function abort(message) {
  console.error(`\n✖ release: ${message}\n`)
  process.exit(1)
}

const version = process.argv[2]
const variant = process.argv[3] ?? 'native'
const production = process.argv.includes('--production')
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) abort('Usage: node scripts/release.mjs <version e.g. 1.0.1> [native|arm64|intel|universal] [--production]')

const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'))
if (tauriConf.version === version) {
  console.log(`tauri.conf.json is already at ${version}.`)
} else {
  tauriConf.version = version
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n')
  console.log(`✓ Bumped tauri.conf.json to ${version}. The website picks this up automatically (__APP_VERSION__).`)
}

const changelog = readFileSync(changelogPath, 'utf8')
if (!changelog.includes(`'${version}'`) && !changelog.includes(`"${version}"`) && !changelog.includes('APP.version')) {
  abort(`No changelog entry mentions ${version} in ${path.relative(root, changelogPath)}. Add one by hand first — release notes are never auto-generated.`)
}
console.log(`✓ Changelog has an entry for this release (or tracks APP.version — add release notes by hand if you haven't yet).`)

const hasSigningKey = Boolean(process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH)
if (!hasSigningKey) {
  console.warn('⚠ TAURI_SIGNING_PRIVATE_KEY(_PATH) not set — this build will NOT produce updater artifacts or a signature. The DMG itself still builds normally; existing installs just won\'t see this version as an update.')
}

console.log(`\nBuilding ${variant}${production ? ' (production: Developer ID required)' : ' (ad-hoc dev build)'}...\n`)
const dmgArgs = [path.join(root, 'scripts/build-dmg.mjs'), variant]
if (production) dmgArgs.push('--production')
const result = spawnSync('node', dmgArgs, { cwd: root, stdio: 'inherit', env: process.env })
if (result.status !== 0) abort('build-dmg.mjs failed — see output above.')

const archToTarget = { arm64: 'aarch64-apple-darwin', intel: 'x86_64-apple-darwin', universal: 'universal-apple-darwin' }
const hostArch = process.arch === 'arm64' ? 'arm64' : 'intel'
const target = archToTarget[variant === 'native' ? hostArch : variant]
const bundleMacosDir = path.join(root, 'src-tauri/target', target, 'release/bundle/macos')
const tarGz = path.join(bundleMacosDir, 'MacBook Cleaner.app.tar.gz')
const sigFile = `${tarGz}.sig`

if (hasSigningKey && existsSync(tarGz) && existsSync(sigFile)) {
  mkdirSync(releaseDir, { recursive: true })
  const manifestPath = path.join(releaseDir, 'update-manifest.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { platforms: {} }
  manifest.version = version
  manifest.pub_date = new Date().toISOString()
  manifest.notes = `See https://macbookcleaner.app/changelog#v${version}`
  const platformKey = target === 'aarch64-apple-darwin' ? 'darwin-aarch64' : target === 'x86_64-apple-darwin' ? 'darwin-x86_64' : 'darwin-universal'
  manifest.platforms[platformKey] = {
    signature: readFileSync(sigFile, 'utf8').trim(),
    // You must upload MacBook Cleaner.app.tar.gz somewhere public and put its real URL here —
    // this placeholder is never a usable download link.
    url: `https://macbookcleaner.app/updates/${version}/${path.basename(tarGz)}`,
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n✓ Updater artifact: ${tarGz}`)
  console.log(`✓ Manifest updated: ${manifestPath} (fill in the real "url" before uploading — see comment above)`)
} else if (hasSigningKey) {
  console.warn(`\n⚠ Expected updater artifacts at ${tarGz} — not found. createUpdaterArtifacts may be off, or this variant/profile doesn't produce them.`)
}

console.log(`
Exact next steps (none of these happen automatically):
1. Review ${path.relative(root, releaseDir)}/ — the DMG, its SHA-256, and (if produced) the update manifest.
2. Fill in the manifest's real "url" for each platform, then upload both the .tar.gz and the manifest JSON
   to the exact path your updater endpoint expects (see tauri.conf.json plugins.updater.endpoints).
3. Upload the DMG itself wherever your website's Download page expects it (or set VITE_MAC_DOWNLOAD_URL).
4. git commit the version bump and changelog entry yourself, after reviewing the diff.
5. This script never tags, pushes, or publishes anything — do that explicitly, yourself, when ready.
`)
