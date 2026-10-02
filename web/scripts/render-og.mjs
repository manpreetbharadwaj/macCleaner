// Renders scripts/og/og-image.html to public/og-image.jpg (1200×630) with
// headless Google Chrome — no image library needed. Run: npm run og
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const html = path.join(root, 'scripts/og/og-image.html')
const png = path.join(root, 'scripts/og/og-image.png')
const out = path.join(root, 'public/og-image.jpg')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(chrome)) {
  console.error('Google Chrome is required to render the OG image.')
  process.exit(1)
}

execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files', '--window-size=1200,630', `--screenshot=${png}`, `file://${html}`], { stdio: 'inherit' })
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', png, '--out', out], { stdio: 'ignore' })
rmSync(png)
console.log(`Wrote ${out}`)
