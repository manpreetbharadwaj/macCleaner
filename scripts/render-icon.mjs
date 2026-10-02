// Rasterizes src-tauri/icons/source/icon.svg to a transparent 1024px PNG
// using headless Google Chrome (no image-library dependency needed). The
// PNG is then fed to `tauri icon`, which generates every bundle size.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const svg = path.join(root, 'src-tauri/icons/source/icon.svg')
const out = path.join(root, 'src-tauri/icons/source/icon-1024.png')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(chrome)) {
  console.error('Google Chrome is required to rasterize the icon. Export icon.svg to a 1024px PNG manually instead.')
  process.exit(1)
}

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--default-background-color=00000000',
  '--window-size=1024,1024',
  `--screenshot=${out}`,
  `file://${svg}`,
], { stdio: 'inherit' })
console.log(`Wrote ${out}`)
