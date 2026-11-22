// Turns the official brand mark (public/logo.png — a flat, full-bleed
// square PNG, not a vector source) into src-tauri/icons/source/icon-1024.png,
// which is then fed to `tauri icon` to generate every bundle size.
//
// The brand mark itself is NOT used full-bleed for the macOS icon: macOS
// does not auto-pad or round app icons — Finder/Dock/Launchpad display
// exactly the pixels given to them. A full-bleed square source renders
// oversized, square-cornered, and visually heavier than every
// neighboring app. compose-macos-icon.swift fixes this by compositing the
// brand mark onto Apple's documented macOS icon grid (1024x1024 canvas,
// content at 824x824/80.47%, 100px/9.77% padding each side, 186px/22.57%
// corner radius) — the exact ratios this project's own original
// hand-drawn icon.svg already used, before it was temporarily replaced
// with a raw full-bleed copy.
//
// This is specific to the macOS app-icon pipeline. Desktop UI and website
// usages of the brand mark are deliberately NOT run through this same
// padding/rounding — see src/components/ui/Logo.tsx and
// web/src/components/Logo.tsx, which apply their own, separately-tuned
// CSS treatment appropriate to each context (see "Create separate
// optimized assets for native macOS icons and website/UI usage" in the
// task that introduced this split).
import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'public/logo.png')
const composer = path.join(root, 'scripts/compose-macos-icon.swift')
const out = path.join(root, 'src-tauri/icons/source/icon-1024.png')

if (!existsSync(source)) {
  console.error(`Expected the brand mark at ${path.relative(root, source)} — it was not found.`)
  process.exit(1)
}

const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', source], { encoding: 'utf8' })
const width = Number(dims.match(/pixelWidth:\s*(\d+)/)?.[1])
const height = Number(dims.match(/pixelHeight:\s*(\d+)/)?.[1])
if (!width || !height || width !== height) {
  console.error(`${path.relative(root, source)} must be square; got ${width}x${height}.`)
  process.exit(1)
}
if (width < 1024) {
  console.error(`${path.relative(root, source)} is ${width}x${height}; need at least 1024x1024 so the composited content is never upscaled.`)
  process.exit(1)
}

execFileSync('swift', [composer, source, out], { stdio: 'inherit' })
