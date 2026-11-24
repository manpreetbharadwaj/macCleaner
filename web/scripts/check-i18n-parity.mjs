// QA tool (not part of the build): verifies every locale has exactly the
// same JSON key structure as English, for every namespace file that exists.
// Run with: node scripts/check-i18n-parity.mjs [locale...] (default: all)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const localesDir = path.join(root, 'src/locales')
const NAMESPACES = ['common', 'seo', 'home', 'features', 'pricing', 'download', 'faq', 'support', 'changelog', 'thankYou', 'notFound', 'privacy', 'terms']

function keyPaths(obj, prefix = '') {
  if (Array.isArray(obj)) return [prefix + '[]']
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k))
  }
  return [prefix]
}

function placeholders(obj, out = new Set()) {
  if (typeof obj === 'string') {
    for (const m of obj.matchAll(/\{\{(\w+)\}\}/g)) out.add(m[1])
    for (const m of obj.matchAll(/<([a-zA-Z0-9-]+)>/g)) out.add(`<${m[1]}>`)
  } else if (Array.isArray(obj)) {
    obj.forEach((v) => placeholders(v, out))
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach((v) => placeholders(v, out))
  }
  return out
}

const allLocales = readdirSync(localesDir).filter((d) => d !== 'en')
const targets = process.argv.slice(2).length ? process.argv.slice(2) : allLocales

const enData = {}
for (const ns of NAMESPACES) {
  enData[ns] = JSON.parse(readFileSync(path.join(localesDir, 'en', `${ns}.json`), 'utf8'))
}

let hadProblem = false
for (const locale of targets) {
  console.log(`\n=== ${locale} ===`)
  for (const ns of NAMESPACES) {
    const file = path.join(localesDir, locale, `${ns}.json`)
    if (!existsSync(file)) {
      console.log(`  MISSING FILE: ${ns}.json`)
      hadProblem = true
      continue
    }
    let data
    try {
      data = JSON.parse(readFileSync(file, 'utf8'))
    } catch (e) {
      console.log(`  INVALID JSON: ${ns}.json — ${e.message}`)
      hadProblem = true
      continue
    }
    const enKeys = new Set(keyPaths(enData[ns]))
    const locKeys = new Set(keyPaths(data))
    const missing = [...enKeys].filter((k) => !locKeys.has(k))
    const extra = [...locKeys].filter((k) => !enKeys.has(k))
    const enPlaceholders = placeholders(enData[ns])
    const locPlaceholders = placeholders(data)
    const missingPlaceholders = [...enPlaceholders].filter((p) => !locPlaceholders.has(p))
    if (missing.length || extra.length || missingPlaceholders.length) {
      hadProblem = true
      if (missing.length) console.log(`  ${ns}.json: MISSING keys: ${missing.join(', ')}`)
      if (extra.length) console.log(`  ${ns}.json: EXTRA keys: ${extra.join(', ')}`)
      if (missingPlaceholders.length) console.log(`  ${ns}.json: MISSING placeholders/tags: ${missingPlaceholders.join(', ')}`)
    } else {
      console.log(`  ${ns}.json: OK (${enKeys.size} keys)`)
    }
  }
}
console.log(hadProblem ? '\nFAIL: see problems above' : '\nPASS: full key + placeholder parity with English')
process.exit(hadProblem ? 1 : 0)
