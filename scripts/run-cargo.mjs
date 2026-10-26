import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const cargoHomeBin = path.join(homedir(), '.cargo', 'bin')
const env = {
  ...process.env,
  PATH: existsSync(cargoHomeBin) ? `${cargoHomeBin}${path.delimiter}${process.env.PATH ?? ''}` : process.env.PATH,
}

const result = spawnSync('cargo', process.argv.slice(2), {
  cwd: path.resolve(import.meta.dirname, '../src-tauri'),
  env,
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Could not run Cargo: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
