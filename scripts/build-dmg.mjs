import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const tauriDir = path.join(root, 'src-tauri')
const conf = JSON.parse(readFileSync(path.join(tauriDir, 'tauri.conf.json'), 'utf8'))
const releaseDir = path.join(root, 'release')
const variant = process.argv[2] ?? 'native'
const production = process.argv.includes('--production')
const hostArch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'intel' : null
const selected = variant === 'native' ? hostArch : variant

const TARGETS = {
  arm64: { triple: 'aarch64-apple-darwin', expected: ['arm64'], label: 'apple-silicon' },
  intel: { triple: 'x86_64-apple-darwin', expected: ['x86_64'], label: 'intel' },
  universal: { triple: 'universal-apple-darwin', expected: ['arm64', 'x86_64'], label: 'universal' },
}

function abort(message) {
  console.error(`\n✖ build-dmg: ${message}\n`)
  process.exit(1)
}

if (process.platform !== 'darwin') abort('DMG builds must run on macOS.')
if (!selected || !TARGETS[selected]) abort('Use native, arm64, intel, or universal.')

const cargoBin = path.join(homedir(), '.cargo', 'bin')
const env = {
  ...process.env,
  PATH: existsSync(cargoBin) ? `${cargoBin}${path.delimiter}${process.env.PATH ?? ''}` : process.env.PATH,
}
const target = TARGETS[selected]

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', ...options })
  if (result.error) abort(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0) abort(`${command} exited with status ${result.status}.`)
}

function output(command, args) {
  return execFileSync(command, args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

const installedTargets = output('rustup', ['target', 'list', '--installed']).split(/\s+/)
const requiredTargets = selected === 'universal' ? ['aarch64-apple-darwin', 'x86_64-apple-darwin'] : [target.triple]
const missingTargets = requiredTargets.filter((item) => !installedTargets.includes(item))
if (missingTargets.length) abort(`Missing Rust target${missingTargets.length > 1 ? 's' : ''}: ${missingTargets.join(', ')}. Install explicitly with: rustup target add ${missingTargets.join(' ')}`)

const tauri = path.join(root, 'node_modules', '.bin', 'tauri')
if (!existsSync(tauri)) abort('Tauri CLI is not installed. Run npm install first.')

const args = ['build', '--bundles', 'dmg', '--target', target.triple]
if (production) {
  const identity = (env.APPLE_SIGNING_IDENTITY ?? '').trim()
  if (!identity || identity === '-') abort('Production builds require APPLE_SIGNING_IDENTITY for a Developer ID Application certificate.')
  const apiCredentials = env.APPLE_API_ISSUER && env.APPLE_API_KEY && env.APPLE_API_KEY_PATH
  const appleIdCredentials = env.APPLE_ID && env.APPLE_PASSWORD && env.APPLE_TEAM_ID
  if (!apiCredentials && !appleIdCredentials) {
    abort('Production builds require either APPLE_API_ISSUER + APPLE_API_KEY + APPLE_API_KEY_PATH, or APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID for notarization.')
  }
  args.push('--config', JSON.stringify({ bundle: { macOS: { signingIdentity: identity, hardenedRuntime: true } } }))
} else {
  console.warn('⚠ Building a development DMG with the configured ad-hoc signature. It is not production trusted and must not be published.')
}

run(tauri, args)

const bundleDir = path.join(tauriDir, 'target', target.triple, 'release', 'bundle', 'dmg')
if (!existsSync(bundleDir)) abort(`Tauri completed but ${path.relative(root, bundleDir)} does not exist.`)
const dmgs = readdirSync(bundleDir)
  .filter((file) => file.endsWith('.dmg'))
  .map((file) => path.join(bundleDir, file))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
const dmg = dmgs[0]
if (!dmg) abort(`No DMG was produced in ${path.relative(root, bundleDir)}.`)

const mount = mkdtempSync(path.join(tmpdir(), 'mbc-release-'))
let info
try {
  try {
    output('/usr/bin/hdiutil', ['attach', dmg, '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount])
    const app = path.join(mount, `${conf.productName}.app`)
    if (!existsSync(app)) throw new Error(`${conf.productName}.app is missing from ${path.basename(dmg)}.`)
    const plist = path.join(app, 'Contents', 'Info.plist')
    const plistValue = (key) => output('/usr/libexec/PlistBuddy', ['-c', `Print ${key}`, plist])
    const executable = path.join(app, 'Contents', 'MacOS', plistValue('CFBundleExecutable'))
    const architectures = output('/usr/bin/lipo', ['-archs', executable]).split(/\s+/).sort()
    const expected = [...target.expected].sort()
    if (architectures.join(',') !== expected.join(',')) throw new Error(`Built binary contains ${architectures.join('+')}, expected ${expected.join('+')}. The DMG was not copied to release/.`)

    const codesign = spawnSync('/usr/bin/codesign', ['-dv', '--verbose=4', app], { encoding: 'utf8' })
    const signingText = `${codesign.stdout ?? ''}\n${codesign.stderr ?? ''}`
    const signature = /Signature=adhoc/.test(signingText) ? 'adhoc' : /Authority=Developer ID Application/.test(signingText) ? 'developer-id' : /Authority=/.test(signingText) ? 'other' : 'unsigned'
    const stapler = spawnSync('/usr/bin/xcrun', ['stapler', 'validate', app], { encoding: 'utf8' })
    const notarized = stapler.status === 0
    if (production && signature !== 'developer-id') throw new Error(`Production build is ${signature}, not Developer ID signed.`)
    if (production && !notarized) throw new Error(`Production build has no valid stapled notarization ticket: ${(stapler.stderr || stapler.stdout || '').trim()}`)

    info = {
      version: plistValue('CFBundleShortVersionString'),
      architectures,
      signature,
      notarized,
    }
  } finally {
    spawnSync('/usr/bin/hdiutil', ['detach', mount, '-quiet'], { encoding: 'utf8' })
    rmSync(mount, { recursive: true, force: true })
  }
} catch (error) {
  abort(error instanceof Error ? error.message : String(error))
}

if (info.version !== conf.version) abort(`DMG contains version ${info.version}; tauri.conf.json declares ${conf.version}.`)
mkdirSync(releaseDir, { recursive: true })
const fileName = `MacBook-Cleaner-${conf.version}-${target.label}.dmg`
const destination = path.join(releaseDir, fileName)
copyFileSync(dmg, destination)
const bytes = readFileSync(destination)
const sha256 = createHash('sha256').update(bytes).digest('hex')
writeFileSync(path.join(releaseDir, `${fileName}.sha256`), `${sha256}  ${fileName}\n`)
writeFileSync(
  path.join(releaseDir, 'latest.json'),
  `${JSON.stringify({ fileName, version: conf.version, sizeBytes: bytes.length, sha256, ...info, productionTrusted: info.signature === 'developer-id' && info.notarized }, null, 2)}\n`,
)

console.log(`\n✓ ${destination}`)
console.log(`  ${info.architectures.join('+')} · ${info.signature} · ${info.notarized ? 'notarized/stapled' : 'not notarized'} · sha256 ${sha256}`)
if (!production) console.log('  Development artifact only. Use npm run dmg:production with Apple credentials for a publishable build.')
