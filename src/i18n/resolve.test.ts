// Run with: node --test src/i18n/resolve.test.ts   (Node 22.6+ strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLocale, resolveLanguage } from './resolve.ts'

const SUPPORTED = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'hi', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ar', 'tr', 'ru']

test('normalizes regional variants', () => {
  assert.equal(normalizeLocale('en-US', SUPPORTED), 'en')
  assert.equal(normalizeLocale('en-GB', SUPPORTED), 'en')
  assert.equal(normalizeLocale('en_IN', SUPPORTED), 'en')
  assert.equal(normalizeLocale('de-DE', SUPPORTED), 'de')
  assert.equal(normalizeLocale('fr-FR', SUPPORTED), 'fr')
  assert.equal(normalizeLocale('pt-BR', SUPPORTED), 'pt')
  assert.equal(normalizeLocale('hi-IN', SUPPORTED), 'hi')
  assert.equal(normalizeLocale('es-419', SUPPORTED), 'es')
})

test('maps Chinese scripts and regions', () => {
  assert.equal(normalizeLocale('zh-CN', SUPPORTED), 'zh-CN')
  assert.equal(normalizeLocale('zh-Hans', SUPPORTED), 'zh-CN')
  assert.equal(normalizeLocale('zh-Hans-CN', SUPPORTED), 'zh-CN')
  assert.equal(normalizeLocale('zh', SUPPORTED), 'zh-CN')
  assert.equal(normalizeLocale('zh-TW', SUPPORTED), 'zh-TW')
  assert.equal(normalizeLocale('zh-Hant-TW', SUPPORTED), 'zh-TW')
  assert.equal(normalizeLocale('zh-HK', SUPPORTED), 'zh-TW')
})

test('unsupported languages return null', () => {
  assert.equal(normalizeLocale('sv-SE', SUPPORTED), null)
  assert.equal(normalizeLocale('', SUPPORTED), null)
})

test('1. English system → English', () => {
  assert.equal(resolveLanguage('system', ['en-US'], SUPPORTED), 'en')
})

test('2. German system → German', () => {
  assert.equal(resolveLanguage('system', ['de-DE', 'en-US'], SUPPORTED), 'de')
})

test('3. unsupported system language → English fallback', () => {
  assert.equal(resolveLanguage('system', ['sv-SE'], SUPPORTED), 'en')
  assert.equal(resolveLanguage('system', [], SUPPORTED), 'en')
  assert.equal(resolveLanguage(undefined, ['fi-FI'], SUPPORTED), 'en')
})

test('picks the first *supported* preferred language, like macOS does', () => {
  assert.equal(resolveLanguage('system', ['sv-SE', 'fr-CA', 'en-US'], SUPPORTED), 'fr')
})

test('4. a manual choice wins over the system language', () => {
  assert.equal(resolveLanguage('de', ['en-US'], SUPPORTED), 'de')
  assert.equal(resolveLanguage('zh-TW', ['en-US'], SUPPORTED), 'zh-TW')
})

test('a manual choice that is no longer supported falls back to the system language', () => {
  assert.equal(resolveLanguage('xx', ['fr-FR'], SUPPORTED), 'fr')
})
