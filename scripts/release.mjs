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

// IMPORTANT: GitHub's own "/releases/latest/" convenience URL explicitly
// excludes every prerelease — confirmed directly against a real public
// repo (vercel/next.js: /releases/latest resolved to v16.4.6 even with
// v16.5.0-canary.60, a newer prerelease, present). While this project is
// shipping beta/prerelease-flagged builds, the updater endpoint must NOT
// use that alias — it would 404 forever, since no non-prerelease release
// exists yet. Instead, both this script and tauri.conf.json's updater
// endpoint use a fixed, perpetual tag named "beta" (not a GitHub-reserved
// alias — just an ordinary tag name this project keeps reusing) whose
// assets get replaced each time a new beta build is ready. See
// docs/github-release-setup.md. Once a real, non-prerelease release
// exists, reconsider switching the endpoint back to "/releases/latest/".
const GITHUB_REPO = 'manpreetbharadwaj/macCleaner'
const BETA_TAG = 'beta'

if (hasSigningKey && existsSync(tarGz) && existsSync(sigFile)) {
  mkdirSync(releaseDir, { recursive: true })
  const manifestPath = path.join(releaseDir, 'latest.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { platforms: {} }
  manifest.version = version
  manifest.pub_date = new Date().toISOString()
  manifest.notes = `See https://macbookcleaner.com/changelog#v${version}`
  // The updater looks up `{os}-{arch}` (e.g. "darwin-aarch64"), computed
  // from the *running* Mac's actual CPU — never "darwin-universal". A
  // universal build's one fat binary covers both, so it must be listed
  // under both keys, pointing at the same url/signature — confirmed
  // directly from tauri-plugin-updater's own source (`target()` returns
  // `format!("{target}-{arch}")`), not assumed.
  const platformKeys = target === 'aarch64-apple-darwin' ? ['darwin-aarch64'] : target === 'x86_64-apple-darwin' ? ['darwin-x86_64'] : ['darwin-aarch64', 'darwin-x86_64']
  const platformEntry = {
    signature: readFileSync(sigFile, 'utf8').trim(),
    // This release's own tag — not /latest/ — so this exact artifact
    // never changes out from under an old install mid-download, even
    // after a newer release becomes "latest".
    url: `https://github.com/${GITHUB_REPO}/releases/download/v${version}/${path.basename(tarGz)}`,
  }
  for (const key of platformKeys) manifest.platforms[key] = platformEntry
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n✓ Updater artifact: ${tarGz}`)
  console.log(`✓ Manifest written: ${manifestPath}`)
} else if (hasSigningKey) {
  console.warn(`\n⚠ Expected updater artifacts at ${tarGz} — not found. createUpdaterArtifacts may be off, or this variant/profile doesn't produce them.`)
}

console.log(`
Exact next steps (none of these happen automatically) — TWO releases while still in beta:
1. Review ${path.relative(root, releaseDir)}/ — the DMG, its SHA-256, and (if produced) latest.json.
2. Permanent, versioned release (human-facing — website link, changelog, historical record):
   gh release create v${version} --draft --prerelease --notes "..."
   gh release upload v${version} release/*.dmg release/*.sha256 <path-to-tar.gz> <path-to-sig>
3. Rolling "${BETA_TAG}" release (machine-facing — this is ALL the updater ever reads):
   gh release create ${BETA_TAG} --draft --prerelease --notes "Rolling beta channel pointer" --target main
     (first time only; a tag named "${BETA_TAG}" that never advances to a real version number is intentional)
   gh release upload ${BETA_TAG} ${path.relative(root, releaseDir)}/latest.json --clobber
     (--clobber replaces the previous beta's manifest — this release's assets are meant to be overwritten every time)
4. Publish BOTH drafts only when you're ready (they're independent "Draft" toggles).
5. git commit the version bump and changelog entry yourself, after reviewing the diff.
6. This script never tags, pushes, creates, or publishes a GitHub Release itself — every step above is separate and explicit.
`)
