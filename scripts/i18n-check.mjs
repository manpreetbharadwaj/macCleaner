// Localization audit. Run: node scripts/i18n-check.mjs
//
// 1. Every locale has exactly the keys English has (plural forms are
//    checked against each language's own CLDR plural categories), and every
//    {{placeholder}} / <tag> in English survives in the translation.
// 2. Every translation key written as a string in the source (keys stored on
//    scan items, nav labels, …) exists in en.json.
// 3. No hardcoded user-facing text is left in components: JSX text, and
//    string values of user-facing props (title, label, placeholder, …).
//
// Exits non-zero on problems so it can gate a build.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const localesDir = path.join(root, 'src/i18n/locales')
const problems = []
const warn = (msg) => problems.push(msg)
const notices = []
// The names the language picker must show (each language in its own script).
const NATIVE_NAMES = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', hi: 'हिन्दी', ja: '日本語', ko: '한국어', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ar: 'العربية', tr: 'Türkçe', ru: 'Русский' }

// ---------- 1. Locale completeness ----------
const load = (f) => JSON.parse(readFileSync(path.join(localesDir, f), 'utf-8'))
const en = load('en.json')
const PLURAL = /_(zero|one|two|few|many|other)$/

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

const enFlat = flatten(en)
// Base keys (plural suffix removed) → whether they're plural in English.
const enBases = new Map()
for (const key of Object.keys(enFlat)) {
  if (key.startsWith('meta.')) continue
  const m = key.match(PLURAL)
  enBases.set(m ? key.slice(0, -m[0].length) : key, Boolean(m))
}
const tokens = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}|<(\/?\w+)\s*\/?>/g)].map((m) => m[1] ?? `<${m[2]}>`).sort()

const localeFiles = readdirSync(localesDir).filter((f) => f.endsWith('.json'))
for (const file of localeFiles) {
  if (file === 'en.json') continue
  const code = file.replace('.json', '')
  const flat = flatten(load(file))
  for (const f of ['englishName', 'nativeName', 'dir']) if (!flat[`meta.${f}`]) warn(`${file}: missing meta.${f}`)
  if (NATIVE_NAMES[code] && flat['meta.nativeName'] !== NATIVE_NAMES[code]) warn(`${file}: meta.nativeName should be "${NATIVE_NAMES[code]}"`)
  if (!['ltr', 'rtl'].includes(flat['meta.dir'])) warn(`${file}: meta.dir must be ltr or rtl`)
  // Sentences left in English (a likely missed translation). Short labels and
  // proper nouns ("Smart Clean", "Xcode DerivedData") can legitimately match.
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith('meta.') || !(key in enFlat)) continue
    const words = String(enFlat[key]).replace(/\{\{\w+\}\}|<\/?\w+>/g, '').match(/[A-Za-z]{2,}/g) ?? []
    if (value === enFlat[key] && words.length >= 3) notices.push(`${file}: ${key} is identical to English`)
  }
  const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories
  for (const [base, plural] of enBases) {
    const enSample = plural ? enFlat[`${base}_other`] : enFlat[base]
    const expected = plural ? categories.map((c) => `${base}_${c}`) : [base]
    for (const key of expected) {
      if (!(key in flat)) {
        warn(`${file}: missing ${key}`)
        continue
      }
      if (typeof flat[key] !== 'string' || !flat[key].trim()) warn(`${file}: empty ${key}`)
      if (!plural && /\{\{\s*count\s*\}\}/.test(flat[key])) warn(`${file}: ${key} uses {{count}} but has no plural forms`)
      const want = tokens(enSample).filter((t) => !(plural && t === 'count'))
      const got = tokens(flat[key])
      for (const t of want) if (!got.includes(t)) warn(`${file}: ${key} lost ${t.startsWith('<') ? t : `{{${t}}}`}`)
      // {{percent}} arrives already formatted by Intl (with its own % sign).
      if (/%\s*\{\{\s*percent\s*\}\}|\{\{\s*percent\s*\}\}\s*%/.test(flat[key])) warn(`${file}: ${key} adds a second % to {{percent}}`)
    }
  }
  for (const key of Object.keys(flat)) {
    if (key.startsWith('meta.')) continue
    const m = key.match(PLURAL)
    const base = m ? key.slice(0, -m[0].length) : key
    if (!enBases.has(base)) warn(`${file}: extra key ${key}`)
  }
}

// ---------- 2 & 3. Source scan ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|ts)$/.test(name) && !name.endsWith('.d.ts') && !name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

// Every string literal / template head that could name a key. A literal
// ending in "." (e.g. `progress.${phase}`) marks a whole family as used.
const usedExact = new Set()
const usedPrefixes = new Set()
const KEYISH = /^[a-z][A-Za-z]*(\.[A-Za-z0-9]*)+$/
function noteUsage(text) {
  if (!KEYISH.test(text)) return
  if (text.endsWith('.')) usedPrefixes.add(text)
  else usedExact.add(text)
}
function collectUsage(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) noteUsage(node.text)
  else if (ts.isTemplateExpression(node)) noteUsage(node.head.text.endsWith('.') ? node.head.text : `${node.head.text}.`)
}

const NAMESPACES = new Set(Object.keys(en).filter((k) => k !== 'meta'))
const USER_PROPS = new Set(['title', 'subtitle', 'label', 'placeholder', 'aria-label', 'alt', 'detail', 'body', 'doneTitle', 'note', 'lockReason', 'description', 'tip'])
// Proper nouns and symbols that are the same in every language.
const ALLOWED = new Set(['MacBook Cleaner', 'Macintosh HD', 'macOS', 'Xcode', 'Apple', '—', '·', '~/Projects/client-work', '%', '+', 'GB', 'MB'])
const looksLikeText = (s) => /[A-Za-z]{2,}/.test(s) && !ALLOWED.has(s.trim())

for (const file of walk(path.join(root, 'src'))) {
  const rel = path.relative(root, file)
  const src = readFileSync(file, 'utf-8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1
  const isMock = rel.includes('/mocks/') || rel.includes('mockPerformanceService') || rel.includes('mockStorageService')

  const visit = (node) => {
    collectUsage(node)
    // Keys written as string literals must exist.
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const v = node.text
      const ns = v.split('.')[0]
      if (/^[a-z][A-Za-z]*(\.[A-Za-z0-9]+)+$/.test(v) && NAMESPACES.has(ns) && !(v in enFlat) && !(`${v}_other` in enFlat)) {
        warn(`${rel}:${line(node)} unknown translation key '${v}'`)
      }
    }
    if (file.endsWith('.tsx') && !isMock) {
      if (ts.isJsxText(node) && looksLikeText(node.text)) warn(`${rel}:${line(node)} hardcoded text "${node.text.trim().slice(0, 60)}"`)
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(sf)
        if (USER_PROPS.has(name) && looksLikeText(node.initializer.text)) warn(`${rel}:${line(node)} hardcoded ${name}="${node.initializer.text.slice(0, 60)}"`)
      }
      // 'Sentence like this' inside JSX expressions (ternaries etc.)
      if (ts.isStringLiteral(node) && /^[A-Z][a-z]+(\s+\S+){1,}/.test(node.text) && node.parent && (ts.isConditionalExpression(node.parent) || ts.isJsxExpression(node.parent) || ts.isBinaryExpression(node.parent))) {
        warn(`${rel}:${line(node)} hardcoded string '${node.text.slice(0, 60)}'`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

// Native (Rust) side: menu, notifications, bundle strings.
for (const dir of ['src-tauri/src', 'src-tauri']) {
  for (const name of readdirSync(path.join(root, dir))) {
    if (!name.endsWith('.rs')) continue
    const src = readFileSync(path.join(root, dir, name), 'utf-8')
    for (const m of src.matchAll(/"(native\.[\w.]+)"/g)) noteUsage(m[1])
    for (const m of src.matchAll(/"(native\.\w+)\.\{/g)) noteUsage(`${m[1]}.`)
    for (const m of src.matchAll(/\["native"\]\["(\w+)"\]/g)) noteUsage(`native.${m[1]}`)
  }
}
// Keys nothing references (dead strings that translators would still pay for).
for (const [base] of enBases) {
  const used = usedExact.has(base) || [...usedPrefixes].some((p) => base.startsWith(p))
  if (!used) warn(`en.json: unused key ${base}`)
}

const count = Object.keys(enFlat).filter((k) => !k.startsWith('meta.')).length
console.log(`${localeFiles.length} locales · ${count} English strings (${enBases.size} keys)`)
if (notices.length) console.log(`ℹ ${notices.length} string(s) identical to English (review):\n  ` + notices.join('\n  '))
if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`\n✖ ${problems.length} problem(s)`)
  process.exit(1)
}
console.log('✓ no missing keys, no lost placeholders, no hardcoded UI text')
