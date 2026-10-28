// Copies the official brand mark (public/logo.png — a flat, square PNG,
// not a vector source) into src-tauri/icons/source/icon-1024.png, which is
// then fed to `tauri icon` to generate every bundle size. Earlier versions
// of this script rasterized a hand-drawn src-tauri/icons/source/icon.svg
// via headless Chrome instead; that SVG is superseded now that the brand
// mark itself is a raster image — see that file's own header comment.
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'public/logo.png')
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
  console.error(`${path.relative(root, source)} is ${width}x${height}; need at least 1024x1024 so no size is upscaled.`)
  process.exit(1)
}

copyFileSync(source, out)
console.log(`Wrote ${out} (copied from ${path.relative(root, source)}, ${width}x${height})`)
